import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';

import type { AgentChannelStatusValue } from '../entities/agent-channel-status.entity';
import { AgentChannelStatus } from '../entities/agent-channel-status.entity';

import type { AgentChannelRef } from '../utils/agent-channel';

/** What one process observed, as its own row records it. */
export interface AgentChannelObservation {
	status: AgentChannelStatusValue;
	errorMessage: string | null;
	attempts: number;
	backoffUntil: Date | null;
	expiresAt: Date | null;
}

const CONFLICT_PATHS = ['agentId', 'integrationType', 'credentialId', 'hostId'] as const;

/**
 * Startup errors carry whatever the platform or the adapter said, which can be a
 * whole response body. Long enough to diagnose, short enough that a row stays
 * readable and a UI can show it.
 */
const MAX_ERROR_MESSAGE_LENGTH = 1024;

class AgentChannelStatusTable extends BaseRepository<AgentChannelStatus> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentChannelStatus, dataSource.manager, transactionRunner);
	}
}

/**
 * Reads and writes what each process observed about the channels it runs.
 *
 * Every write goes to this process's own row, and the caller cannot say
 * otherwise: the `hostId` comes from {@link InstanceSettings} rather than from a
 * parameter, so "overwrite another main's row" is not a mistake this API can
 * express. That single-writer rule is what keeps a reported status from
 * contradicting itself when several mains run the same channel.
 *
 * The one exception is {@link deleteExpired}, which is explicit about crossing
 * that line and only touches rows their own owner has stopped refreshing.
 */
@Service()
export class AgentChannelStatusRepository {
	private readonly table: AgentChannelStatusTable;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.table = new AgentChannelStatusTable(dataSource, transactionRunner);
	}

	/**
	 * Write this process's account of one channel.
	 *
	 * `updatedAt` is passed explicitly because TypeORM only overwrites columns
	 * present in the value literal on conflict. The message is capped here rather
	 * than at the call sites so no caller can bloat a row with a response body.
	 */
	async saveOwn(
		ref: AgentChannelRef,
		observation: AgentChannelObservation,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).upsert(
			AgentChannelStatus,
			{
				...this.own(ref),
				...observation,
				errorMessage: observation.errorMessage?.slice(0, MAX_ERROR_MESSAGE_LENGTH) ?? null,
				updatedAt: new Date(),
			},
			[...CONFLICT_PATHS],
		);
	}

	/** Keep this process's row counting, without disturbing its retry deadline. */
	async refreshOwnLease(
		ref: AgentChannelRef,
		expiresAt: Date | null,
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(AgentChannelStatus, this.own(ref), { expiresAt, updatedAt: new Date() });
	}

	/**
	 * Withdraw what this process said about a channel, because it is no longer
	 * running it — whether the channel was removed, the agent unpublished, or
	 * ownership moved to another main.
	 */
	async clearOwnChannel(ref: AgentChannelRef, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentChannelStatus, this.own(ref));
	}

	/** Withdraw everything this process said, on its way out. */
	async clearOwnHost(ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.delete(AgentChannelStatus, { hostId: this.instanceSettings.hostId });
	}

	async findOwnChannel(
		ref: AgentChannelRef,
		ctx: OperationContext,
	): Promise<AgentChannelStatus | null> {
		return await this.table.managerFor(ctx).findOneBy(AgentChannelStatus, this.own(ref));
	}

	/** This process's own rows, for deciding what to retry and what to refresh. */
	async findOwnAll(ctx: OperationContext): Promise<AgentChannelStatus[]> {
		return await this.table
			.managerFor(ctx)
			.findBy(AgentChannelStatus, { hostId: this.instanceSettings.hostId });
	}

	/** Every process's account of this agent's channels, for reporting. */
	async findByAgentId(agentId: string, ctx: OperationContext): Promise<AgentChannelStatus[]> {
		return await this.table.managerFor(ctx).findBy(AgentChannelStatus, { agentId });
	}

	/**
	 * Rows whose owner stopped refreshing them: it crashed, or it was killed
	 * before it could withdraw them. `hostId` is regenerated on restart, so the
	 * owner will never come back to clean up after itself. Rows with no expiry are
	 * left alone — nothing is refreshing them by design.
	 */
	async deleteExpired(now: Date, ctx: OperationContext): Promise<number> {
		const { affected } = await this.table
			.managerFor(ctx)
			.delete(AgentChannelStatus, { expiresAt: LessThan(now) });
		return affected ?? 0;
	}

	private own(ref: AgentChannelRef) {
		return { ...ref, hostId: this.instanceSettings.hostId };
	}
}
