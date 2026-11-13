import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { MAX_PUBSUB_PAYLOAD_BYTES } from '@n8n/backend-services';

/**
 * One place that answers cluster questions for the agents module.
 *
 * Do not read `isMultiMain`, `multiMainSetup.enabled` or the executions mode in
 * agent code. Different checks in different files caused relays that worked
 * with two mains but not with one main and workers.
 */
@Service()
export class AgentClusterService {
	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * True when another process can hold agent state that a change here must
	 * reach: a turn, a stream listener, a runtime cache or a bridge. Pub/sub
	 * only exists in queue mode, so this is the queue-mode check.
	 */
	shouldRelayAcrossProcesses(): boolean {
		return this.executionsConfig.mode === 'queue';
	}

	/** True when more than one main can serve requests and a leader exists. */
	hasMultipleMains(): boolean {
		return this.globalConfig.multiMainSetup.enabled;
	}

	get isMain(): boolean {
		return this.instanceSettings.instanceType === 'main';
	}

	get isWorker(): boolean {
		return this.instanceSettings.instanceType === 'worker';
	}

	get isLeader(): boolean {
		return this.instanceSettings.isLeader;
	}

	/** False when a payload is too large for a pub/sub message. */
	fitsInPubSubMessage(payload: unknown): boolean {
		return pubSubPayloadBytes(payload) <= MAX_PUBSUB_PAYLOAD_BYTES;
	}
}

export function pubSubPayloadBytes(payload: unknown): number {
	return Buffer.byteLength(JSON.stringify(payload) ?? '', 'utf8');
}
