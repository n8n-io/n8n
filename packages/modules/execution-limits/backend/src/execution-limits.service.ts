import {
	executionLimitMaxExecutionsSchema,
	executionLimitSettingsSchema,
	type ExecutionLimitSettings,
} from '@n8n/api-types';
import {
	isForeignKeyConstraintError,
	ProjectRepository,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import {
	findDuplicateProjectIds,
	findProjectLimitsAboveInstanceLimit,
	isDefaultProjectLimitAboveInstanceLimit,
} from './execution-limit-rules';
import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import { ExecutionLimitsSnapshot } from './execution-limits-snapshot';
import type { ApplicableLimits, ProjectLimit } from './execution-limits.types';
import { ProjectExecutionLimitRepository } from './project-execution-limit.repository';

function rejectIfAny(
	projectIds: string[],
	message: string,
	ErrorClass: typeof BadRequestError | typeof NotFoundError = BadRequestError,
): void {
	if (projectIds.length > 0) throw new ErrorClass(`${message}: ${projectIds.join(', ')}`);
}

@Service()
export class ExecutionLimitsService {
	constructor(
		private readonly settingsStore: ExecutionLimitSettingsStore,
		private readonly projectLimitRepository: ProjectExecutionLimitRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly snapshot: ExecutionLimitsSnapshot,
	) {}

	/**
	 * The limits that apply to an execution of this project. Reads memory only, so it is safe
	 * at every execution start. `null` means that this process has not loaded the limits yet.
	 */
	getApplicableLimits(projectId: string): ApplicableLimits | null {
		return this.snapshot.read(projectId);
	}

	/** The period, the instance limit and the default limit for new projects. */
	async getSettings(): Promise<ExecutionLimitSettings> {
		return await this.settingsStore.read({});
	}

	/**
	 * Changes the given settings and keeps the others. A `null` maximum removes that limit.
	 * An instance limit below a project limit is accepted. The project limit stays as it is.
	 * The default limit for new projects cannot be above the instance limit.
	 */
	async updateSettings(changes: Partial<ExecutionLimitSettings>): Promise<ExecutionLimitSettings> {
		return await this.commit(async (ctx) => {
			const current = await this.settingsStore.lockAndRead(ctx);

			const merged = executionLimitSettingsSchema.safeParse({ ...current, ...changes });
			if (!merged.success) {
				throw BadRequestError.wrap('The execution limit settings are not valid', merged.error);
			}
			if (isDefaultProjectLimitAboveInstanceLimit(merged.data)) {
				throw new BadRequestError(
					'The default limit for new projects cannot be above the instance limit',
				);
			}

			await this.settingsStore.write(merged.data, ctx);

			return merged.data;
		});
	}

	/** The limits of the given projects, or of all projects. A project with no limit is left out. */
	async getProjectLimits(projectIds?: string[]): Promise<ProjectLimit[]> {
		return projectIds
			? await this.projectLimitRepository.findByProjectIds(projectIds, {})
			: await this.projectLimitRepository.findAll({});
	}

	/** Sets the limit of one or many projects. One limit that is not valid rejects all of them. */
	async setProjectLimits(limits: ProjectLimit[]): Promise<void> {
		const projectIds = limits.map(({ projectId }) => projectId);
		rejectIfAny(findDuplicateProjectIds(limits), 'A project can have only one execution limit');
		rejectIfAny(
			limits
				.filter(
					({ maxExecutions }) =>
						!executionLimitMaxExecutionsSchema.safeParse(maxExecutions).success,
				)
				.map(({ projectId }) => projectId),
			'The execution limit of these projects is out of range',
		);
		const existing = new Set(
			(await this.projectRepository.findTypesByIds(projectIds)).map(({ id }) => id),
		);
		rejectIfAny(
			projectIds.filter((id) => !existing.has(id)),
			'These projects do not exist',
			NotFoundError,
		);

		try {
			await this.commit(async (ctx) => {
				const { instanceMaxExecutions } = await this.settingsStore.read(ctx);
				rejectIfAny(
					findProjectLimitsAboveInstanceLimit(limits, instanceMaxExecutions),
					`The execution limit of these projects is above the instance limit of ${instanceMaxExecutions}`,
				);

				await this.projectLimitRepository.upsertMany(limits, ctx);
			});
		} catch (error) {
			// A project that was deleted after the check above.
			if (isForeignKeyConstraintError(error)) {
				throw new NotFoundError('A project to limit does not exist');
			}
			throw error;
		}
	}

	/** Removes the limit of the given projects. A project with no limit is ignored. */
	async removeProjectLimits(projectIds: string[]): Promise<void> {
		await this.commit(async (ctx) => {
			await this.projectLimitRepository.deleteByProjectIds(projectIds, ctx);
		});
	}

	/** Every write goes through here, so the limits in memory reload after each commit. */
	private async commit<T>(write: (ctx: OperationContext) => Promise<T>): Promise<T> {
		const result = await this.transactionRunner.run({}, write);
		await this.snapshot.refreshAfterWrite();

		return result;
	}
}
