import { defineStore } from 'pinia';
import type { PoolAssignment, UpdateWorkerPoolAssignmentDto, WorkerStatus } from '@n8n/api-types';

import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getWorkerPools,
	sendGetWorkerStatus,
	updateWorkerPoolAssignment,
} from '@n8n/rest-api-client/api/orchestration';

export const WORKER_HISTORY_LENGTH = 100;
const STALE_SECONDS = 120 * 1000;
const WORKER_POOLS_POLL_INTERVAL_MS = 10_000;

export interface IOrchestrationStoreState {
	initialStatusReceived: boolean;
	workers: { [id: string]: WorkerStatus };
	workersHistory: {
		[id: string]: IWorkerHistoryItem[];
	};
	workersLastUpdated: { [id: string]: number };
	statusInterval: NodeJS.Timeout | null;
	availablePools: string[];
	poolAssignment: PoolAssignment | null;
	workerPoolsInterval: NodeJS.Timeout | null;
}

export interface IWorkerHistoryItem {
	timestamp: number;
	data: WorkerStatus;
}

export const useOrchestrationStore = defineStore('orchestrationManager', {
	state: (): IOrchestrationStoreState => ({
		initialStatusReceived: false,
		workers: {},
		workersHistory: {},
		workersLastUpdated: {},
		statusInterval: null,
		availablePools: [],
		poolAssignment: null,
		workerPoolsInterval: null,
	}),
	actions: {
		updateWorkerStatus(data: WorkerStatus) {
			this.workers[data.senderId] = data;
			if (!this.workersHistory[data.senderId]) {
				this.workersHistory[data.senderId] = [];
			}
			this.workersHistory[data.senderId].push({ data, timestamp: Date.now() });
			if (this.workersHistory[data.senderId].length > WORKER_HISTORY_LENGTH) {
				this.workersHistory[data.senderId].shift();
			}
			this.workersLastUpdated[data.senderId] = Date.now();

			this.initialStatusReceived = true;
		},
		removeStaleWorkers() {
			for (const id in this.workersLastUpdated) {
				if (this.workersLastUpdated[id] + STALE_SECONDS < Date.now()) {
					delete this.workers[id];
					delete this.workersHistory[id];
					delete this.workersLastUpdated[id];
				}
			}
		},
		startWorkerStatusPolling() {
			const rootStore = useRootStore();
			if (!this.statusInterval) {
				this.statusInterval = setInterval(async () => {
					await sendGetWorkerStatus(rootStore.restApiContext);
					this.removeStaleWorkers();
				}, 1000);
			}
		},
		stopWorkerStatusPolling() {
			if (this.statusInterval) {
				clearInterval(this.statusInterval);
				this.statusInterval = null;
			}
		},
		getWorkerLastUpdated(workerId: string): number {
			return this.workersLastUpdated[workerId] ?? 0;
		},
		getWorkerStatus(workerId: string): WorkerStatus | undefined {
			return this.workers[workerId];
		},
		getWorkerStatusHistory(workerId: string): IWorkerHistoryItem[] {
			return this.workersHistory[workerId] ?? [];
		},
		async fetchWorkerPools() {
			const rootStore = useRootStore();
			const response = await getWorkerPools(rootStore.restApiContext);
			this.availablePools = response.pools;
			this.poolAssignment = response.assignment;
		},
		startWorkerPoolsPolling() {
			if (this.workerPoolsInterval) return;
			this.workerPoolsInterval = setInterval(async () => {
				try {
					await this.fetchWorkerPools();
				} catch {
					// Swallow errors during polling — surfacing a toast every 10s would be noisy.
					// The initial fetch on mount surfaces errors to the user.
				}
			}, WORKER_POOLS_POLL_INTERVAL_MS);
		},
		stopWorkerPoolsPolling() {
			if (this.workerPoolsInterval) {
				clearInterval(this.workerPoolsInterval);
				this.workerPoolsInterval = null;
			}
		},
		async updateWorkerPoolAssignment(dto: UpdateWorkerPoolAssignmentDto) {
			const rootStore = useRootStore();
			this.poolAssignment = await updateWorkerPoolAssignment(rootStore.restApiContext, dto);
		},
	},
});
