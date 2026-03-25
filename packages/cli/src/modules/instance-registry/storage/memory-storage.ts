import type { InstanceRegistration } from '@n8n/api-types';

import type { InstanceStorage } from './instance-storage.interface';

/**
 * In-memory storage backend for single-instance deployments.
 * Stores a single local registration with no external dependencies.
 */
export class MemoryInstanceStorage implements InstanceStorage {
	readonly kind = 'memory';

	private localRegistration: InstanceRegistration | null = null;

	private lastKnownStateMap = new Map<string, InstanceRegistration>();

	async register(registration: InstanceRegistration): Promise<void> {
		this.localRegistration = registration;
	}

	async heartbeat(registration: InstanceRegistration): Promise<void> {
		this.localRegistration = registration;
	}

	async unregister(instanceKey: string): Promise<void> {
		if (this.localRegistration?.instanceKey === instanceKey) {
			this.localRegistration = null;
		}
	}

	async getAllRegistrations(): Promise<InstanceRegistration[]> {
		return this.localRegistration ? [this.localRegistration] : [];
	}

	async getRegistration(instanceKey: string): Promise<InstanceRegistration | null> {
		if (this.localRegistration?.instanceKey === instanceKey) {
			return this.localRegistration;
		}
		return null;
	}

	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		return new Map(this.lastKnownStateMap);
	}

	async saveLastKnownState(state: Map<string, InstanceRegistration>): Promise<void> {
		this.lastKnownStateMap = new Map(state);
	}

	async cleanupStaleMembers(): Promise<number> {
		return 0;
	}
}
