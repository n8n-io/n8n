import type { LeaderElectionClient } from '@/scaling/leader-election-client';
import type { Logger } from '@n8n/backend-common';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import assert from 'node:assert';

import type { MultiMainStrategy } from './multi-main-setup.types';

type EmitFn = (event: 'leader-takeover' | 'leader-stepdown') => void;

export class MultiMainSetupV2 implements MultiMainStrategy {
	private leaderCheckInProgress = false;

	private get hostId() {
		return this.instanceSettings.hostId;
	}

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
		private readonly client: LeaderElectionClient,
		private readonly emit: EmitFn,
	) {}

	async init() {
		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis during init', result.error);
			this.instanceSettings.markAsFollower();
		} else if (result.result) {
			this.takeOverAsLeader();
		} else {
			this.instanceSettings.markAsFollower();
		}
	}

	async shutdown() {
		const { isLeader } = this.instanceSettings;

		if (isLeader) {
			// TODO: We should guard here that we only remove the key the key in Redis matches
			// our host ID.
			const result = await this.client.clearLeader();
			if (!result.ok) {
				this.logger.warn('Failed to clear leader key from Redis', { error: result.error });
			}
		}

		this.client.destroy();
	}

	async checkLeader() {
		if (this.leaderCheckInProgress) {
			this.logger.warn('Previous leader check is still in progress, skipping this check');
			return;
		}

		this.leaderCheckInProgress = true;
		try {
			if (this.instanceSettings.isLeader) {
				await this.checkAreWeStillLeader();
			} else {
				await this.checkCanBecomeLeader();
			}
		} finally {
			this.leaderCheckInProgress = false;
		}
	}

	/** Renew our leadership lease. If we've lost the lease, step down to follower. */
	private async checkAreWeStillLeader() {
		assert(this.instanceSettings.isLeader);

		const renewTtlResult = await this.client.tryRenewLeaderTtl();
		if (!renewTtlResult.ok) {
			this.logRedisCommandFailure('Failed to renew leader TTL', renewTtlResult.error);
			// There's a decision to be made here: Do we step down or not? Redis might
			// be unavailable for all clients or only for us. We could also track the TTL
			// locally, but this would make the implementation more complex and error-prone.
			// For now we accept that this might cause some inconsistencies in a network
			// partition scenario, but eventually the system will recover once Redis is available again.
			return;
		}

		const renewalResult = renewTtlResult.result;
		if (renewalResult.id === 'success') {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is this instance`);
			return;
		}

		this.logger.warn('[Multi-main setup] Leader failed to renew leader key');

		if (renewalResult.id === 'other-host-is-leader') {
			this.logger.debug(
				`[Instance ID ${this.hostId}] Leader is other instance "${renewalResult.currentLeaderId}"`,
			);
			this.stepDownToFollower();
			return;
		}

		// The only remaining case is 'key-missing', which means we lost leadership
		// (e.g. due to Redis unavailability or a network partition). In this case
		// we try to become leader and step down if that fails.
		assert(renewalResult.id === 'key-missing');

		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis', result.error);
			this.stepDownToFollower();
			return;
		}

		const wasSet = result.result;
		if (!wasSet) {
			this.stepDownToFollower();
		}
	}

	private async checkCanBecomeLeader() {
		assert(!this.instanceSettings.isLeader);

		const getResult = await this.client.getLeader();
		if (!getResult.ok) {
			this.logRedisCommandFailure('Failed to get leader key from Redis', getResult.error);
			return;
		}

		const leaderId = getResult.result;
		if (leaderId && leaderId === this.hostId) {
			this.errorReporter.info(
				`[Instance ID ${this.hostId}] Remote/Local leadership mismatch, marking self as leader`,
				{
					shouldBeLogged: true,
					shouldReport: true,
				},
			);

			this.takeOverAsLeader();
			return;
		}

		if (leaderId) {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is other instance "${leaderId}"`);
			return;
		}

		this.logger.debug(
			`[Instance ID ${this.hostId}] Leadership vacant, attempting to become leader...`,
		);

		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logger.warn('Failed to try leader key set in Redis', { error: result.error });
			return;
		}

		const wasSet = result.result;
		if (wasSet) {
			this.takeOverAsLeader();
		}
	}

	private takeOverAsLeader() {
		assert(!this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] Leader is now this instance`);

		this.instanceSettings.markAsLeader();

		this.emit('leader-takeover');
	}

	private stepDownToFollower() {
		assert(this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] This is now a follower instance`);

		this.instanceSettings.markAsFollower();

		this.emit('leader-stepdown');
	}

	async fetchLeaderKey() {
		const result = await this.client.getLeader();
		return result.ok ? result.result : null;
	}

	private logRedisCommandFailure(message: string, error: Error) {
		this.logger.warn(`${message}: ${error.message}`, { error });
	}
}
