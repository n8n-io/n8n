import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { InstanceRegistryProxyService, MAX_PUBSUB_PAYLOAD_BYTES } from '@n8n/backend-services';

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
		private readonly instanceRegistry: InstanceRegistryProxyService,
	) {}

	/**
	 * Instance registry key of this process. A restart gets a new key, so a
	 * turn that records this key cannot be mistaken for a turn of the next
	 * process on the same host. Null when the registry is not loaded.
	 */
	get instanceKey(): string | null {
		return this.instanceRegistry.getLocalInstance()?.instanceKey ?? null;
	}

	/**
	 * Keys of the processes that the registry reports as alive. Returns null
	 * when the answer cannot be trusted: a failed registry read returns an
	 * empty list, and this process is always registered, so a list without
	 * this process means the read failed. Do not interrupt a turn on null.
	 */
	async activeInstanceKeys(): Promise<Set<string> | null> {
		const own = this.instanceKey;
		if (!own) return null;
		const keys = new Set(
			(await this.instanceRegistry.getAllInstances()).map(({ instanceKey }) => instanceKey),
		);
		return keys.has(own) ? keys : null;
	}

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
