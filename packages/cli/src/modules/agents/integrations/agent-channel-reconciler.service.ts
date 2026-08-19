import { isDraftIntegration, type AgentIntegrationConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import { AgentChannelStatusReporter } from './agent-channel-status-reporter';
import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService } from './chat-integration.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentChannelStatus } from '../entities/agent-channel-status.entity';
import {
	AgentChannelStatusRepository,
	type AgentChannelRef,
} from '../repositories/agent-channel-status.repository';
import { AgentRepository } from '../repositories/agent.repository';

/** Why a pass is running. Only the periodic one waits out a channel's backoff. */
export type ChannelReconcileReason = 'startup' | 'leader-takeover' | 'interval';

/** Channels a pass should see running, keyed by {@link channelKey}. */
type WantedChannels = Map<string, { agent: Agent; integration: AgentIntegrationConfig }>;

function channelKey(ref: AgentChannelRef): string {
	return `${ref.agentId}:${ref.integrationType}:${ref.credentialId}`;
}

/**
 * Keeps the channels this main runs in line with the channels the published
 * configuration asks for, and keeps its account of them current.
 *
 * Before this loop, starting a channel happened exactly once — on publish, or in
 * a single pass at startup — and every one of those paths swallowed its errors.
 * A channel that failed to start therefore stayed down until someone republished
 * the agent, while the API still reported it as connected. Causes are not
 * enumerated here on purpose: a known one is a bug to fix where it happens, and
 * this loop is what makes the unknown ones recoverable.
 *
 * The pass ticks on every main for the whole process lifetime, and what it does
 * depends on the role held at that moment, so leadership changes never start or
 * stop it. Three sets drive one pass:
 *
 * - what the cluster wants running (every published agent's channels),
 * - what this main should run (the same, minus leader-only channels when this
 *   main is a follower),
 * - what this main is running.
 *
 * Every write it makes is to this main's own status rows. Rows belonging to
 * other processes are only ever deleted once their owner has stopped refreshing
 * them, which is the one thing their owner cannot do for itself.
 */
@Service()
export class AgentChannelReconciler {
	private reconcileInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly agentRepository: AgentRepository,
		private readonly channelStatusRepository: AgentChannelStatusRepository,
		private readonly statusReporter: AgentChannelStatusReporter,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Start the loop and run the first pass now rather than an interval later, so
	 * this main picks up its channels as soon as it boots.
	 */
	init(): void {
		const intervalSeconds = this.agentsConfig.channelReconcileIntervalSeconds;
		if (intervalSeconds <= 0) {
			this.logger.info(
				'[AgentChannelReconciler] Channel reconciliation is disabled — a channel that fails to start will stay down until the agent is republished',
			);
			return;
		}

		this.reconcileInterval = setInterval(
			async () => await this.reconcile('interval'),
			intervalSeconds * Time.seconds.toMilliseconds,
		);
		// Never a reason to hold the process open.
		this.reconcileInterval.unref();

		this.logger.debug(`[AgentChannelReconciler] Reconciling channels every ${intervalSeconds}s`);

		void this.reconcile('startup');
	}

	/**
	 * Withdraw this process's rows on the way out, so a rolling restart doesn't
	 * leave its channels looking degraded for the length of a lease. A crash skips
	 * this, which is what the lease is for.
	 */
	@OnShutdown()
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		clearInterval(this.reconcileInterval);
		this.reconcileInterval = undefined;

		await this.statusReporter.withdrawAll();
	}

	/**
	 * A fresh leader owns channels the previous one did — polling channels above
	 * all — and must not wait an interval to claim them. Gated on the loop
	 * running so a disabled reconciler stays inert.
	 */
	@OnLeaderTakeover()
	async reconcileOnLeaderTakeover(): Promise<void> {
		if (!this.reconcileInterval) return;

		await this.reconcile('leader-takeover');
	}

	/**
	 * One pass. Errors never escape: a pass that throws would kill the interval
	 * and take recovery with it, so the next tick retries instead.
	 */
	async reconcile(reason: ChannelReconcileReason): Promise<void> {
		if (this.isShuttingDown) return;

		try {
			const agents = await this.agentRepository.findPublished();
			const ownStatuses = await this.channelStatusRepository.findOwnAll();

			const wantedByCluster: WantedChannels = new Map();
			const wantedHere: WantedChannels = new Map();

			for (const agent of agents) {
				for (const integration of agent.integrations ?? []) {
					// A draft entry has no credential to connect with. The builder writes
					// it so the panel can show a needs-setup chip, and publishing rejects
					// it, so it can only be here mid-setup.
					if (isDraftIntegration(integration)) continue;

					const key = channelKey({
						agentId: agent.id,
						integrationType: integration.type,
						credentialId: integration.credentialId,
					});
					wantedByCluster.set(key, { agent, integration });
					if (this.runsHere(integration)) wantedHere.set(key, { agent, integration });
				}
			}

			await this.settleWanted(wantedHere, ownStatuses, reason);
			await this.releaseGhosts(wantedHere);
			await this.forgetOwnOrphans(wantedHere, ownStatuses);
			await this.sweepExpired();
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true });
		}
	}

	/**
	 * Leader-only channels (Telegram polling) run on exactly one main, so a
	 * follower must leave them alone — including their status, which belongs to
	 * whichever main is actually running them.
	 */
	private runsHere(integration: AgentIntegrationConfig): boolean {
		const definition = this.integrationRegistry.get(integration.type);
		return !definition?.requiresLeader() || this.instanceSettings.isLeader;
	}

	/**
	 * Bring every channel this main should run to a running state, and keep this
	 * main's account of the ones already running from going stale.
	 */
	private async settleWanted(
		wantedHere: WantedChannels,
		ownStatuses: AgentChannelStatus[],
		reason: ChannelReconcileReason,
	): Promise<void> {
		const ownByChannel = new Map(ownStatuses.map((status) => [channelKey(status), status]));
		const now = new Date();

		for (const [key, { agent, integration }] of wantedHere) {
			if (this.isShuttingDown) return;

			const ref = this.refOf(agent, integration);
			const own = ownByChannel.get(key);

			if (this.chatIntegrationService.hasLiveChannel(ref)) {
				await this.affirmRunning(ref, own);
				continue;
			}

			// Startup and takeover always try: the backoff was set by an earlier life
			// of this process or by whatever it inherited, and a restart or a
			// promotion is exactly when the cause may have gone away.
			if (reason === 'interval' && !this.statusReporter.isRetryReady(own, now)) continue;

			try {
				await this.chatIntegrationService.startChannel(agent, integration);
				this.logger.info('[AgentChannelReconciler] Started channel', {
					agentId: agent.id,
					type: integration.type,
					reason,
				});
			} catch (error) {
				// `connect` has already recorded why, which is what the user sees.
				// Logged at warn rather than error because a retry is scheduled and the
				// state is reported — this is not the last word on the channel.
				this.logger.warn('[AgentChannelReconciler] Could not start channel', {
					agentId: agent.id,
					type: integration.type,
					attempts: (own?.attempts ?? 0) + 1,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Keep this main's row saying what is true of this main: the channel is up.
	 *
	 * A row that already says so only needs its lease extended. A missing one has
	 * to be written — that is every channel on an instance that just upgraded,
	 * live but never reported, which would otherwise read as `starting` forever.
	 * One saying `error` belongs to an earlier attempt by this same process that
	 * has since succeeded.
	 */
	private async affirmRunning(
		ref: AgentChannelRef,
		own: AgentChannelStatus | undefined,
	): Promise<void> {
		if (own?.status === 'connected') {
			await this.statusReporter.refreshLease(ref);
			return;
		}

		await this.statusReporter.recordConnected(ref);
	}

	/**
	 * Release channels this main runs but should not — the agent was unpublished,
	 * the channel removed, or this main is a follower holding a leader-only
	 * channel. Teardown withdraws this main's row on its own, because in every one
	 * of those cases this main has stopped running the channel.
	 */
	private async releaseGhosts(wantedHere: WantedChannels): Promise<void> {
		for (const ref of this.chatIntegrationService.listLiveChannels()) {
			if (this.isShuttingDown) return;
			if (wantedHere.has(channelKey(ref))) continue;

			try {
				await this.chatIntegrationService.disconnect(ref.agentId, {
					type: ref.integrationType,
					credentialId: ref.credentialId,
				});

				this.logger.info('[AgentChannelReconciler] Released channel', {
					agentId: ref.agentId,
					type: ref.integrationType,
				});
			} catch (error) {
				this.logger.warn('[AgentChannelReconciler] Could not release channel', {
					agentId: ref.agentId,
					type: ref.integrationType,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Drop this main's rows for channels it should no longer be reporting on, when
	 * there is no live connection left to withdraw them — a failed startup that was
	 * then unpublished, or a channel that moved to the leader. Left alone they
	 * would report an error against a channel nobody is running any more.
	 */
	private async forgetOwnOrphans(
		wantedHere: WantedChannels,
		ownStatuses: AgentChannelStatus[],
	): Promise<void> {
		for (const status of ownStatuses) {
			if (this.isShuttingDown) return;
			if (wantedHere.has(channelKey(status))) continue;

			await this.statusReporter.withdraw({
				agentId: status.agentId,
				integrationType: status.integrationType,
				credentialId: status.credentialId,
			});
		}
	}

	/**
	 * Delete rows whose owner stopped refreshing them. This is the only place a
	 * process touches rows it does not own, and it is safe because a lease past its
	 * expiry means the owner is gone: it crashed, and `hostId` is regenerated on
	 * restart, so it will never recognise them as its own again.
	 *
	 * Leader-only because one main is enough, and because it is a cluster-wide
	 * cleanup rather than anybody's own account.
	 */
	private async sweepExpired(): Promise<void> {
		if (!this.instanceSettings.isLeader) return;

		try {
			const deleted = await this.channelStatusRepository.deleteExpired(new Date());
			if (deleted > 0) {
				this.logger.debug(
					`[AgentChannelReconciler] Cleared ${deleted} channel status rows left by instances that are gone`,
				);
			}
		} catch (error) {
			this.logger.warn('[AgentChannelReconciler] Could not sweep expired channel statuses', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private refOf(agent: Agent, integration: AgentIntegrationConfig): AgentChannelRef {
		return {
			agentId: agent.id,
			integrationType: integration.type,
			credentialId: integration.credentialId,
		};
	}
}
