import {
	executionLimitMaxExecutionsSchema,
	executionLimitSettingsSchema,
	type ExecutionLimitSettings,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import {
	isForeignKeyConstraintError,
	ProjectRepository,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { ExecutionLimitAuditRepository } from './execution-limit-audit.repository';
import {
	findDuplicateProjectIds,
	diffProjectLimits,
	findProjectLimitsAboveInstanceLimit,
	diffLimitSettings,
	isDefaultProjectLimitAboveInstanceLimit,
} from './execution-limit-rules';
import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import { ExecutionLimitsSnapshot } from './execution-limits-snapshot';
import type {
	ApplicableLimits,
	ExecutionLimitChange,
	ProjectLimit,
	RecordedExecutionLimitChange,
} from './execution-limits.types';
import { ProjectExecutionLimitRepository } from './project-execution-limit.repository';

type LimitWrite<T> = (
	ctx: OperationContext,
	settings: ExecutionLimitSettings,
) => Promise<{ result: T; changes: ExecutionLimitChange[] }>;

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
		private readonly auditRepository: ExecutionLimitAuditRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * The limits that apply to an execution of this project. Reads memory only, so it is safe
	 * at every execution start. `null` means that this process has not loaded the limits yet.
	 * A `null` project has the instance limit only.
	 */
	getApplicableLimits(projectId: string | null): ApplicableLimits | null {
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
	async updateSettings(
		changes: Partial<ExecutionLimitSettings>,
		updatedBy: string | null,
		loginId?: string,
	): Promise<ExecutionLimitSettings> {
		return await this.commit(updatedBy, loginId, async (ctx, current) => {
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

			return { result: merged.data, changes: diffLimitSettings(current, merged.data) };
		});
	}

	/** The limits of the given projects, or of all projects. A project with no limit is left out. */
	async getProjectLimits(projectIds?: string[]): Promise<ProjectLimit[]> {
		return projectIds
			? await this.projectLimitRepository.findByProjectIds(projectIds, {})
			: await this.projectLimitRepository.findAll({});
	}

	/** Sets the limit of one or many projects. One limit that is not valid rejects all of them. */
	async setProjectLimits(
		limits: ProjectLimit[],
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
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
			await this.commit(updatedBy, loginId, async (ctx, { instanceMaxExecutions }) => {
				rejectIfAny(
					findProjectLimitsAboveInstanceLimit(limits, instanceMaxExecutions),
					`The execution limit of these projects is above the instance limit of ${instanceMaxExecutions}`,
				);

				const before = await this.projectLimitRepository.findByProjectIds(projectIds, ctx);
				await this.projectLimitRepository.upsertMany(limits, ctx);

				return {
					result: undefined,
					changes: diffProjectLimits(before, limits),
				};
			});
		} catch (error) {
			// A project that was deleted after the check above.
			if (isForeignKeyConstraintError(error)) {
				throw new NotFoundError('A project to limit does not exist');
			}
			throw error;
		}
	}

	async applyDefaultLimitToNewProject(projectId: string): Promise<void> {
		if ((await this.settingsStore.read({})).defaultProjectMaxExecutions === null) return;

		await this.commit(null, undefined, async (ctx, { defaultProjectMaxExecutions }) => {
			if (defaultProjectMaxExecutions === null) return { result: undefined, changes: [] };

			const limits = [{ projectId, maxExecutions: defaultProjectMaxExecutions }];
			const before = await this.projectLimitRepository.findByProjectIds([projectId], ctx);
			await this.projectLimitRepository.upsertMany(limits, ctx);

			return { result: undefined, changes: diffProjectLimits(before, limits) };
		});
	}

	/** Removes the limit of the given projects. A project with no limit is ignored. */
	async removeProjectLimits(
		projectIds: string[],
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
		await this.commit(updatedBy, loginId, this.deleteLimitsOf(projectIds));
	}

	async removeLimitOfDeletedProject(
		projectId: string,
		updatedBy: string | null,
		loginId: string | undefined,
		ctx: OperationContext,
	): Promise<() => Promise<void>> {
		const { recorded } = await this.recordIn(
			ctx,
			updatedBy,
			loginId,
			this.deleteLimitsOf([projectId]),
		);

		return async () => await this.announce(recorded);
	}

	private deleteLimitsOf(projectIds: string[]): LimitWrite<undefined> {
		return async (ctx) => {
			const before = await this.projectLimitRepository.findByProjectIds(projectIds, ctx);
			await this.projectLimitRepository.deleteByProjectIds(projectIds, ctx);

			return { result: undefined, changes: diffProjectLimits(before, []) };
		};
	}

	private async commit<T>(
		updatedBy: string | null,
		loginId: string | undefined,
		write: LimitWrite<T>,
	): Promise<T> {
		const { result, recorded } = await this.transactionRunner.run(
			{},
			async (ctx) => await this.recordIn(ctx, updatedBy, loginId, write),
		);
		await this.announce(recorded);

		return result;
	}

	private async recordIn<T>(
		ctx: OperationContext,
		updatedBy: string | null,
		loginId: string | undefined,
		write: LimitWrite<T>,
	): Promise<{ result: T; recorded: RecordedExecutionLimitChange[] }> {
		const settings = await this.settingsStore.lockAndRead(ctx);
		const { result, changes } = await write(ctx, settings);
		const recorded: RecordedExecutionLimitChange[] = changes.map((change) => ({
			...change,
			updatedBy,
			loginId,
		}));
		await this.auditRepository.append(recorded, ctx);

		return { result, recorded };
	}

	/** Every write ends here after its transaction commits, so the limits in memory reload. */
	private async announce(recorded: RecordedExecutionLimitChange[]): Promise<void> {
		if (recorded.length === 0) return;

		for (const change of recorded) {
			this.eventService.emit('execution-limit-updated', change);
		}
		await this.snapshot.refreshAfterWrite();
	}
}
