import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';

import type { AgentChannelStatusValue } from '../entities/agent-channel-status.entity';
import { AgentChannelStatus } from '../entities/agent-channel-status.entity';

/** Identifies one channel of one agent, across all processes running it. */
export interface AgentChannelRef {
	agentId: string;
	integrationType: string;
	credentialId: string;
}

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
export class AgentChannelStatusRepository extends Repository<AgentChannelStatus> {
	constructor(
		dataSource: DataSource,
		private readonly instanceSettings: InstanceSettings,
	) {
		super(AgentChannelStatus, dataSource.manager);
	}

	/**
	 * Write this process's account of one channel.
	 *
	 * `updatedAt` is passed explicitly because TypeORM only overwrites columns
	 * present in the value literal on conflict. The message is capped here rather
	 * than at the call sites so no caller can bloat a row with a response body.
	 */
	async saveOwn(ref: AgentChannelRef, observation: AgentChannelObservation): Promise<void> {
		await this.upsert(
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
	async refreshOwnLease(ref: AgentChannelRef, expiresAt: Date | null): Promise<void> {
		await this.update(this.own(ref), { expiresAt, updatedAt: new Date() });
	}

	/**
	 * Withdraw what this process said about a channel, because it is no longer
	 * running it — whether the channel was removed, the agent unpublished, or
	 * ownership moved to another main.
	 */
	async clearOwnChannel(ref: AgentChannelRef): Promise<void> {
		await this.delete(this.own(ref));
	}

	/** Withdraw everything this process said, on its way out. */
	async clearOwnHost(): Promise<void> {
		await this.delete({ hostId: this.instanceSettings.hostId });
	}

	async findOwnChannel(ref: AgentChannelRef): Promise<AgentChannelStatus | null> {
		return await this.findOneBy(this.own(ref));
	}

	/** This process's own rows, for deciding what to retry and what to refresh. */
	async findOwnAll(): Promise<AgentChannelStatus[]> {
		return await this.findBy({ hostId: this.instanceSettings.hostId });
	}

	/** Every process's account of this agent's channels, for reporting. */
	async findByAgentId(agentId: string): Promise<AgentChannelStatus[]> {
		return await this.findBy({ agentId });
	}

	/**
	 * Rows whose owner stopped refreshing them: it crashed, or it was killed
	 * before it could withdraw them. `hostId` is regenerated on restart, so the
	 * owner will never come back to clean up after itself. Rows with no expiry are
	 * left alone — nothing is refreshing them by design.
	 */
	async deleteExpired(now: Date): Promise<number> {
		const { affected } = await this.delete({ expiresAt: LessThan(now) });
		return affected ?? 0;
	}

	private own(ref: AgentChannelRef) {
		return { ...ref, hostId: this.instanceSettings.hostId };
	}
}
