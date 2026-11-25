import { Logger } from '@n8n/backend-common';
import { CorruptedExecutionDataError } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
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

/** After this many failed attempts in a row, the backfill skips the execution. */
const MAX_ATTEMPTS_PER_EXECUTION = 5;

/**
 * Time after the first call in which a process of an earlier n8n version can
 * still end an execution and leave its files unassigned, for example a worker
 * in a rolling deployment.
 */
const EARLIER_VERSION_GRACE_MS = Time.hours.toMilliseconds;

const progressSchema = z.object({
	/**
	 * The `past` pass covers the executions that exist at the first call. The
	 * `recent` pass covers those that stopped between the first call and the
	 * end of the grace period.
	 */
	pass: z.enum(['past', 'recent']),
	/** Time of the first call, in milliseconds since the epoch. */
	startedAt: z.number().int().nonnegative(),
	/** Every execution of the pass up to this ID is done. */
	lastExecutionId: z.number().int().nonnegative(),
	/** Highest execution ID that the pass covers. */
	throughExecutionId: z.number().int().nonnegative(),
	/** Failed attempts in a row for the next execution after `lastExecutionId`. */
	failedAttempts: z.number().int().nonnegative(),
});

type Progress = z.infer<typeof progressSchema>;

const isPassComplete = ({ lastExecutionId, throughExecutionId }: Progress) =>
	lastExecutionId >= throughExecutionId;

const isDone = (progress: Progress) => progress.pass === 'recent' && isPassComplete(progress);

const isRecentPassDue = (progress: Progress) =>
	progress.pass === 'past' &&
	isPassComplete(progress) &&
	Date.now() >= progress.startedAt + EARLIER_VERSION_GRACE_MS;

/** The `recent` pass has few executions, so it takes them in one range. */
const nextRangeEnd = ({ pass, lastExecutionId, throughExecutionId }: Progress) =>
	pass === 'recent'
		? throughExecutionId
		: Math.min(lastExecutionId + EXECUTION_ID_RANGE_SIZE, throughExecutionId);

/** Undefined for the `past` pass, which covers the executions whatever their stop time. */
const stoppedSinceOf = ({ pass, startedAt }: Progress) =>
	pass === 'recent' ? new Date(startedAt) : undefined;

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
	 * data refers to it, and continues where the previous call stopped. Covers
	 * the executions that exist at the first call. When the grace period for
	 * processes of an earlier n8n version has passed, also covers the executions
	 * that stopped since the first call. Returns when all of them are done, when
	 * `signal` aborts, or when `budgetMs` has passed.
	 *
	 * @throws {Error} when an execution cannot be handled, for the first attempts on that execution
	 */
	async backfill(signal: AbortSignal, budgetMs: number): Promise<void> {
		const deadline = Date.now() + budgetMs;
		const mustStop = () => signal.aborted || Date.now() >= deadline;

		const start = await this.loadProgress();
		const end = await this.continueFrom(start, mustStop);

		if (isDone(end) && !isDone(start)) {
			this.logger.info('Finished the backfill of unassigned binary data files');
		}
	}

	/** Continues the current pass, then the `recent` pass when it is due. */
	private async continueFrom(start: Progress, mustStop: () => boolean): Promise<Progress> {
		const progress = await this.backfillPass(start, mustStop);

		return isRecentPassDue(progress)
			? await this.backfillPass(await this.startRecentPass(progress), mustStop)
			: progress;
	}

	private async backfillPass(start: Progress, mustStop: () => boolean): Promise<Progress> {
		let progress = start;

		while (!isPassComplete(progress) && !mustStop()) {
			progress = await this.backfillNextRange(progress, mustStop);
		}

		return progress;
	}

	/** Saved progress, or the progress of a backfill that starts now. */
	private async loadProgress(): Promise<Progress> {
		const saved = await this.settingsRepository.findByKey(PROGRESS_SETTINGS_KEY);

		return saved ? progressSchema.parse(jsonParse(saved.value)) : await this.startPastPass();
	}

	private async startPastPass(): Promise<Progress> {
		return await this.startPass('past', Date.now());
	}

	private async startRecentPass({ startedAt }: Progress): Promise<Progress> {
		return await this.startPass('recent', startedAt);
	}

	/** Saves and returns the progress of a pass that covers every current execution, or none when no file is unassigned. */
	private async startPass(pass: Progress['pass'], startedAt: number): Promise<Progress> {
		const throughExecutionId = (await this.databaseManager.hasUnassignedExecutionFiles())
			? await this.executionRepository.findHighestId()
			: 0;

		return await this.saveProgress({
			pass,
			startedAt,
			lastExecutionId: 0,
			throughExecutionId,
			failedAttempts: 0,
		});
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
	private async backfillNextRange(start: Progress, mustStop: () => boolean): Promise<Progress> {
		const rangeEnd = nextRangeEnd(start);
		const executionIds = await this.executionRepository.findIdsByModeInIdRange(
			'webhook',
			start.lastExecutionId,
			rangeEnd,
			stoppedSinceOf(start),
		);

		let progress = start;
		for (const executionId of executionIds) {
			if (mustStop()) {
				return await this.saveProgress(progress);
			}

			progress = await this.backfillExecution(progress, executionId);
		}

		return await this.saveProgress({ ...progress, lastExecutionId: rangeEnd, failedAttempts: 0 });
	}

	/**
	 * Returns the progress after `executionId`. When the execution cannot be
	 * handled, saves the failed attempt and throws. After
	 * `MAX_ATTEMPTS_PER_EXECUTION` failed attempts in a row, skips the execution,
	 * so that one bad execution does not stop the backfill.
	 */
	private async backfillExecution(progress: Progress, executionId: string): Promise<Progress> {
		try {
			await this.assignFilesOf(executionId);
		} catch (error) {
			const failedAttempts = progress.failedAttempts + 1;

			if (failedAttempts < MAX_ATTEMPTS_PER_EXECUTION) {
				await this.saveProgress({ ...progress, failedAttempts });
				throw error;
			}

			this.logSkipped(executionId, error);
		}

		return { ...progress, lastExecutionId: Number(executionId), failedAttempts: 0 };
	}

	private async assignFilesOf(executionId: string) {
		const fileIds = await this.findDatabaseFileIdsOf(executionId);

		await this.databaseManager.assignToExecution(fileIds, executionId);
	}

	/** Empty when the execution is gone or its data is lost. Throws on any other read failure. */
	private async findDatabaseFileIdsOf(executionId: string): Promise<string[]> {
		try {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			return execution ? databaseFileIdsToAssign(execution.data) : [];
		} catch (error) {
			if (isLostExecutionData(error)) {
				this.logSkipped(executionId, error);
				return [];
			}

			throw error;
		}
	}

	private logSkipped(executionId: string, error: unknown) {
		this.logger.warn('Skipped an execution in the backfill of unassigned binary data files', {
			executionId,
			error,
		});
	}
}
