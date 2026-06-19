import type { InstanceRegistration, PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type {
	ClusterCheckAuditEvent,
	ClusterCheckContext,
	ClusterCheckPushNotification,
	ClusterCheckResult,
	ClusterCheckWarning,
	ClusterStateDiff,
	IClusterCheck,
} from '@n8n/decorators';
import {
	ClusterCheckMetadata,
	OnLeaderStepdown,
	OnLeaderTakeover,
	OnShutdown,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { EventNamesAuditType } from '@/eventbus/event-message-classes';
import type { EventPayloadAudit } from '@/eventbus/event-message-classes/event-message-audit';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Push } from '@/push';

import { InstanceRegistryService } from '../instance-registry.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';

/**
 * Leader-only service that reconciles cluster state and runs health checks
 * on a fixed interval. Discovers checks via `ClusterCheckMetadata`, fans them
 * out with error isolation, and forwards each result into logs, the audit
 * event bus, and the push channel.
 */
@Service()
export class CheckService {
	private reconcileController?: AbortController;
	private reconcileTimer: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly checks: IClusterCheck[] = [];

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly instanceRegistryService: InstanceRegistryService,
		private readonly clusterCheckMetadata: ClusterCheckMetadata,
		private readonly messageEventBus: MessageEventBus,
		private readonly push: Push,
	) {
		this.logger = logger.scoped('instance-registry');
	}

	init() {
		this.discoverChecks();
		if (this.instanceSettings.isLeader) this.startReconciliation();
	}

	@OnLeaderTakeover()
	startReconciliation() {
		if (this.isShuttingDown || this.reconcileController) return;
		this.reconcileController = new AbortController();
		const { signal } = this.reconcileController;

		void this.runReconcileSafely(signal);
		this.scheduleNextReconcile(signal);

		this.logger.debug('Cluster check reconciliation scheduled');
	}

	@OnLeaderStepdown()
	stopReconciliation() {
		this.reconcileController?.abort();
		this.reconcileController = undefined;
		clearTimeout(this.reconcileTimer);
		this.reconcileTimer = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopReconciliation();
	}

	private scheduleNextReconcile(signal: AbortSignal) {
		if (signal.aborted) return;
		this.reconcileTimer = setTimeout(async () => {
			await this.runReconcileSafely(signal);
			this.scheduleNextReconcile(signal);
		}, REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);
	}

	private discoverChecks() {
		const checkClasses = this.clusterCheckMetadata.getClasses();

		for (const CheckClass of checkClasses) {
			try {
				const check = Container.get(CheckClass);
				this.checks.push(check);
			} catch (error) {
				this.logger.error(`Failed to instantiate cluster check "${CheckClass.name}"`, {
					error,
				});
			}
		}

		this.logger.info(`Discovered ${this.checks.length} cluster checks`, {
			names: this.checks.map((c) => c.checkDescription.name),
		});
	}

	private async runReconcileSafely(signal: AbortSignal) {
		try {
			await this.reconcile(signal);
		} catch (error) {
			this.logger.warn('Reconciliation cycle failed', { error });
		}
	}

	/**
	 * Evaluates all registered cluster checks against the current cluster state
	 * and returns their aggregated results. Side-effect free: does not dispatch
	 * warnings/audit events/push notifications and does not persist state.
	 *
	 * Safe to call from any instance (leader or follower), e.g. from the REST
	 * controller serving the cluster overview UI. The leader's scheduled
	 * reconciliation loop is the single writer of `lastKnownState`; this method
	 * only reads it to build the diff context for checks.
	 */
	async runChecks(): Promise<{
		currentState: Map<string, InstanceRegistration>;
		results: Array<{
			checkName: string;
			checkDisplayName?: string;
			result?: ClusterCheckResult;
			failed?: true;
		}>;
	}> {
		if (this.checks.length === 0) {
			return { currentState: new Map(), results: [] };
		}

		const instances = await this.instanceRegistryService.getAllInstances();
		const currentState = new Map<string, InstanceRegistration>(
			instances.map((i) => [i.instanceKey, i]),
		);

		const previousState = await this.instanceRegistryService.getLastKnownState();
		const diff = computeDiff(previousState, currentState);

		const context: ClusterCheckContext = { currentState, previousState, diff };

		const settled = await Promise.allSettled(
			this.checks.map(async (check) => await check.run(context)),
		);

		const results: Array<{
			checkName: string;
			checkDisplayName?: string;
			result?: ClusterCheckResult;
			failed?: true;
		}> = [];
		for (let i = 0; i < settled.length; i++) {
			const outcome = settled[i];
			const check = this.checks[i];
			const checkResult: {
				checkName: string;
				checkDisplayName?: string;
				result?: ClusterCheckResult;
				failed?: true;
			} = {
				checkName: check.checkDescription.name,
				checkDisplayName: check.checkDescription.displayName,
			};
			if (outcome.status === 'fulfilled') {
				checkResult.result = outcome.value;
			} else {
				this.logger.error('Cluster check failed', {
					...checkResult,
					error: outcome.reason,
				});
				checkResult.failed = true;
			}
			results.push(checkResult);
		}

		return { currentState, results };
	}

	private async reconcile(signal: AbortSignal) {
		if (this.checks.length === 0) return;

		if (signal.aborted) return;

		const { currentState, results } = await this.runChecks();

		if (signal.aborted) return;

		for (const { checkName, result } of results) {
			this.processResult(checkName, result);
		}

		try {
			if (signal.aborted) return;
			await this.instanceRegistryService.saveLastKnownState(currentState);
		} catch (error) {
			this.logger.warn('Failed to persist last known cluster state', { error });
		}
	}

	private processResult(checkName: string, result?: ClusterCheckResult) {
		for (const warning of result?.warnings ?? []) {
			this.logWarning(checkName, warning);
		}

		for (const event of result?.auditEvents ?? []) {
			this.emitAuditEvent(checkName, event);
		}

		for (const notification of result?.pushNotifications ?? []) {
			this.broadcastPush(checkName, notification);
		}
	}

	private logWarning(checkName: string, warning: ClusterCheckWarning) {
		const severity = warning.severity ?? 'warning';
		const method = severity === 'info' ? 'info' : severity === 'error' ? 'error' : 'warn';
		this.logger[method]('Cluster check warning', {
			check: checkName,
			code: warning.code,
			message: warning.message,
			context: warning.context,
		});
	}

	private emitAuditEvent(checkName: string, event: ClusterCheckAuditEvent) {
		void this.messageEventBus
			.sendAuditEvent({
				eventName: event.eventName as EventNamesAuditType,
				payload: event.payload as unknown as EventPayloadAudit,
			})
			.catch((error: unknown) => {
				this.logger.warn('Failed to emit cluster check audit event', {
					check: checkName,
					eventName: event.eventName,
					error,
				});
			});
	}

	private broadcastPush(checkName: string, notification: ClusterCheckPushNotification) {
		try {
			this.push.broadcast({
				type: notification.type,
				data: notification.data,
			} as PushMessage);
		} catch (error) {
			this.logger.warn('Failed to broadcast cluster check push notification', {
				check: checkName,
				type: notification.type,
				error,
			});
		}
	}
}

/**
 * Computes the structured diff between two cluster state snapshots keyed by
 * `instanceKey`. Exported for direct unit testing.
 *
 * Equality for the `changed` bucket ignores `lastSeen` — heartbeats refresh it
 * every 30s, which would otherwise flag every instance on every cycle.
 */
export function computeDiff(
	previousState: ReadonlyMap<string, InstanceRegistration>,
	currentState: ReadonlyMap<string, InstanceRegistration>,
): ClusterStateDiff {
	const added: InstanceRegistration[] = [];
	const removed: InstanceRegistration[] = [];
	const changed: Array<{ previous: InstanceRegistration; current: InstanceRegistration }> = [];

	for (const [key, current] of currentState) {
		const previous = previousState.get(key);
		if (!previous) {
			added.push(current);
		} else if (!isEquivalent(previous, current)) {
			changed.push({ previous, current });
		}
	}

	for (const [key, previous] of previousState) {
		if (!currentState.has(key)) removed.push(previous);
	}

	return { added, removed, changed };
}

function isEquivalent(a: InstanceRegistration, b: InstanceRegistration): boolean {
	return (
		a.schemaVersion === b.schemaVersion &&
		a.instanceKey === b.instanceKey &&
		a.hostId === b.hostId &&
		a.instanceType === b.instanceType &&
		a.instanceRole === b.instanceRole &&
		a.version === b.version
	);
}
