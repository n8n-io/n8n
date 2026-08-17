import type { InstanceRegistration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import type {
	HypervisorMessageHandler,
	HypervisorWorker,
} from '@/scaling/hypervisor-message-router';

import type { InstanceStorage } from './instance-storage.interface';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';

// Worker → primary
export type RegistryRegister = { type: 'registry:register'; registration: InstanceRegistration };
export type RegistryHeartbeat = { type: 'registry:heartbeat'; registration: InstanceRegistration };
export type RegistryUnregister = { type: 'registry:unregister'; instanceKey: string };
export type RegistryQuery = { type: 'registry:query'; requestId: number };
// Primary → worker
export type RegistrySnapshot = {
	type: 'registry:snapshot';
	requestId: number;
	registrations: InstanceRegistration[];
};
export type RegistryMessage =
	| RegistryRegister
	| RegistryHeartbeat
	| RegistryUnregister
	| RegistryQuery
	| RegistrySnapshot;

const isRegistryUpsert = (m: { type: string }): m is RegistryRegister | RegistryHeartbeat =>
	(m.type === 'registry:register' || m.type === 'registry:heartbeat') && 'registration' in m;
const isRegistryUnregister = (m: { type: string }): m is RegistryUnregister =>
	m.type === 'registry:unregister';
const isRegistryQuery = (m: { type: string }): m is RegistryQuery =>
	m.type === 'registry:query' && 'requestId' in m;
const isRegistrySnapshot = (m: unknown): m is RegistrySnapshot =>
	typeof m === 'object' &&
	m !== null &&
	(m as { type?: unknown }).type === 'registry:snapshot' &&
	Array.isArray((m as { registrations?: unknown }).registrations);

/**
 * Primary-side registry, hosted by the hypervisor. Holds each forked child's
 * registration keyed by `worker.id` and reuses the router's `onExit` (the same
 * `cluster.on('exit')` liveness the leader host uses — no parallel tracker). It
 * stamps a unique `hostId` from the PID the primary knows, sidestepping the
 * docker hostname clash the redis/memory backends can hit.
 */
@Service()
export class InstanceRegistryHost implements HypervisorMessageHandler {
	readonly prefix = 'registry:';

	private readonly registrations = new Map<number, InstanceRegistration>();

	onMessage(worker: HypervisorWorker, message: { type: string }): void {
		if (isRegistryUpsert(message)) {
			this.registrations.set(worker.id, {
				...message.registration,
				hostId: `${message.registration.instanceType}-${worker.process.pid}`,
			});
		} else if (isRegistryUnregister(message)) {
			this.registrations.delete(worker.id);
		} else if (isRegistryQuery(message)) {
			worker.send({
				type: 'registry:snapshot',
				requestId: message.requestId,
				registrations: [...this.registrations.values()],
			} satisfies RegistrySnapshot);
		}
	}

	onExit(worker: HypervisorWorker): void {
		this.registrations.delete(worker.id);
	}
}

/**
 * Worker-side storage backing the instance registry on the hypervisor's IPC
 * channel. Writes are fire-and-forget to the primary; `getAllRegistrations` is a
 * request/response round-trip to the primary's authoritative view.
 */
export class IpcInstanceStorage implements InstanceStorage {
	readonly kind = 'ipc';

	private readonly lastKnownStateMap = new Map<string, InstanceRegistration>();

	private readonly pending = new Map<
		number,
		{ resolve: (registrations: InstanceRegistration[]) => void; timer: NodeJS.Timeout }
	>();

	private nextRequestId = 0;

	constructor() {
		process.on('message', this.onMessage);
	}

	async register(registration: InstanceRegistration): Promise<void> {
		process.send?.({ type: 'registry:register', registration } satisfies RegistryRegister);
	}

	async heartbeat(registration: InstanceRegistration): Promise<void> {
		process.send?.({ type: 'registry:heartbeat', registration } satisfies RegistryHeartbeat);
	}

	async unregister(instanceKey: string): Promise<void> {
		process.send?.({ type: 'registry:unregister', instanceKey } satisfies RegistryUnregister);
	}

	async getAllRegistrations(): Promise<InstanceRegistration[]> {
		return await this.query();
	}

	async getRegistration(instanceKey: string): Promise<InstanceRegistration | null> {
		const all = await this.query();
		return all.find((r) => r.instanceKey === instanceKey) ?? null;
	}

	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		return new Map(this.lastKnownStateMap);
	}

	async saveLastKnownState(state: Map<string, InstanceRegistration>): Promise<void> {
		this.lastKnownStateMap.clear();
		for (const [key, value] of state) this.lastKnownStateMap.set(key, value);
	}

	// The primary is authoritative for liveness (cluster.on('exit')), so there are
	// no orphaned members to reconcile.
	async cleanupStaleMembers(): Promise<number> {
		return 0;
	}

	async destroy(): Promise<void> {
		process.off('message', this.onMessage);
		for (const { timer, resolve } of this.pending.values()) {
			clearTimeout(timer);
			resolve([]);
		}
		this.pending.clear();
	}

	private async query(): Promise<InstanceRegistration[]> {
		const requestId = this.nextRequestId++;
		return await new Promise<InstanceRegistration[]>((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(requestId);
				Container.get(Logger).warn('Instance-registry IPC query timed out; returning empty');
				resolve([]);
			}, REGISTRY_CONSTANTS.OPERATION_TIMEOUT_MS);
			this.pending.set(requestId, { resolve, timer });
			process.send?.({ type: 'registry:query', requestId } satisfies RegistryQuery);
		});
	}

	private onMessage = (message: unknown) => {
		if (!isRegistrySnapshot(message)) return;
		const entry = this.pending.get(message.requestId);
		if (!entry) return;
		clearTimeout(entry.timer);
		this.pending.delete(message.requestId);
		entry.resolve(message.registrations);
	};
}
