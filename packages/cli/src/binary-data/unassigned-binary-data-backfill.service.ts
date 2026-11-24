import { Logger } from '@n8n/backend-common';
import { CorruptedExecutionDataError } from '@n8n/backend-services';
import { ExecutionRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import type { IRunExecutionData } from 'n8n-workflow';
import { z } from 'zod';

import { DatabaseManager } from '@/binary-data/database.manager';
import { collectDatabaseFileIds } from '@/execution-lifecycle/restore-binary-data-id';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

const PROGRESS_SETTINGS_KEY = 'binaryData.unassignedFilesBackfill';

const EXECUTION_ID_RANGE_SIZE = 200;

const progressSchema = z.object({
	/** Every execution up to this ID is done. */
	lastExecutionId: z.number().int().nonnegative(),
	/** Highest execution ID that the backfill covers. */
	throughExecutionId: z.number().int().nonnegative(),
});

type Progress = z.infer<typeof progressSchema>;

const isComplete = ({ lastExecutionId, throughExecutionId }: Progress) =>
	lastExecutionId >= throughExecutionId;

/** Whether a read failed because the data of the execution is corrupt or gone, which a retry cannot repair. */
const isLostExecutionData = (error: unknown) =>
	error instanceof CorruptedExecutionDataError || error instanceof MissingExecutionDataError;

/** Empty for a sub-execution, whose run data refers to files of its parent, and for an execution without run data. */
const databaseFileIdsToAssign = (data?: Partial<IRunExecutionData>) =>
	data?.parentExecution ? [] : collectDatabaseFileIds(data?.resultData?.runData ?? {});

/**
 * Repairs the database files of webhook executions that ended before n8n
 * assigned such files to their execution. Executions in other modes are not
 * covered, to limit how much execution data the backfill reads.
 */
@Service()
export class UnassignedBinaryDataBackfillService {
	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly databaseManager: DatabaseManager,
	) {}

	/**
	 * Assigns each unassigned database file to the webhook execution whose run
	 * data refers to it. Covers the executions that exist at the first call, and
	 * continues where the previous call stopped. Returns when all of them are
	 * done, when `signal` aborts, or when `budgetMs` has passed.
	 */
	async backfill(signal: AbortSignal, budgetMs: number): Promise<void> {
		const deadline = Date.now() + budgetMs;
		const mustStop = () => signal.aborted || Date.now() >= deadline;
		let progress = await this.loadProgress();

		while (!isComplete(progress) && !mustStop()) {
			progress = await this.backfillNextRange(progress, mustStop);
		}
	}

	/** Saved progress, or the progress of a backfill that starts now. */
	private async loadProgress(): Promise<Progress> {
		const saved = await this.settingsRepository.findByKey(PROGRESS_SETTINGS_KEY);

		if (saved) {
			return progressSchema.parse(jsonParse(saved.value));
		}

		const progress = await this.startProgress();
		await this.saveProgress(progress);
		return progress;
	}

	/** Covers every current execution, or none when no file is unassigned. */
	private async startProgress(): Promise<Progress> {
		const throughExecutionId = (await this.databaseManager.hasUnassignedExecutionFiles())
			? await this.executionRepository.findHighestId()
			: 0;

		return { lastExecutionId: 0, throughExecutionId };
	}

	/** Saves and returns `progress`. */
	private async saveProgress(progress: Progress): Promise<Progress> {
		await this.settingsRepository.upsertByKey(
			PROGRESS_SETTINGS_KEY,
			JSON.stringify(progress),
			false,
			{},
		);

		return progress;
	}

	/**
	 * Handles the webhook executions of the next ID range, then saves and returns
	 * the progress. When `mustStop` turns true inside the range, the progress ends
	 * at the last execution that was handled.
	 */
	private async backfillNextRange(progress: Progress, mustStop: () => boolean): Promise<Progress> {
		const rangeEnd = Math.min(
			progress.lastExecutionId + EXECUTION_ID_RANGE_SIZE,
			progress.throughExecutionId,
		);
		const executionIds = await this.executionRepository.findIdsByModeInIdRange(
			'webhook',
			progress.lastExecutionId,
			rangeEnd,
		);

		let lastExecutionId = progress.lastExecutionId;
		for (const executionId of executionIds) {
			if (mustStop()) {
				return await this.saveProgress({ ...progress, lastExecutionId });
			}

			await this.assignFilesOf(executionId);
			lastExecutionId = Number(executionId);
		}

		const next = await this.saveProgress({ ...progress, lastExecutionId: rangeEnd });

		if (isComplete(next)) {
			this.logger.info('Finished the backfill of unassigned binary data files');
		}

		return next;
	}

	private async assignFilesOf(executionId: string) {
		const fileIds = await this.findDatabaseFileIdsOf(executionId);

		await this.databaseManager.assignToExecution(fileIds, executionId);
	}

	/**
	 * Empty when the execution is gone or its data is lost, so that one bad
	 * execution does not stop the backfill. Throws on any other read failure.
	 */
	private async findDatabaseFileIdsOf(executionId: string): Promise<string[]> {
		try {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			return execution ? databaseFileIdsToAssign(execution.data) : [];
		} catch (error) {
			if (isLostExecutionData(error)) {
				this.logger.warn('Skipped an execution in the backfill of unassigned binary data files', {
					executionId,
					error,
				});
				return [];
			}

			throw error;
		}
	}
}
