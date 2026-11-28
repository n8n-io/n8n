import { executionLimitSettingsSchema, type ExecutionLimitSettings } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { ExecutionLimitAuditRepository } from './execution-limit-audit.repository';
import { diffLimitSettings } from './execution-limit-rules';
import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import { ExecutionLimitsSnapshot } from './execution-limits-snapshot';
import type {
	ApplicableLimits,
	ExecutionLimitChange,
	RecordedExecutionLimitChange,
} from './execution-limits.types';

type LimitWrite<T> = (
	ctx: OperationContext,
	settings: ExecutionLimitSettings,
) => Promise<{ result: T; changes: ExecutionLimitChange[] }>;

@Service()
export class ExecutionLimitsService {
	constructor(
		private readonly settingsStore: ExecutionLimitSettingsStore,
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

	/** The period and the instance limit. */
	async getSettings(): Promise<ExecutionLimitSettings> {
		return await this.settingsStore.read({});
	}

	/**
	 * Changes the given settings and keeps the others. A `null` maximum removes that limit.
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

			await this.settingsStore.write(merged.data, ctx);

			return { result: merged.data, changes: diffLimitSettings(current, merged.data) };
		});
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
