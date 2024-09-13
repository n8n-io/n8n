import { defineStore } from 'pinia';
import type { WorkerStatus } from '@n8n/api-types';

import { useRootStore } from './root.store';
import { sendGetWorkerStatus } from '../api/orchestration';

export const WORKER_HISTORY_LENGTH = 100;
const STALE_SECONDS = 120 * 1000;

export interface IOrchestrationStoreState {
	initialStatusReceived: boolean;
	workers: { [id: string]: WorkerStatus };
	workersHistory: {
		[id: string]: IWorkerHistoryItem[];
	};
	workersLastUpdated: { [id: string]: number };
	statusInterval: NodeJS.Timer | null;
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
	}),
	actions: {
		updateWorkerStatus(data: WorkerStatus) {
			this.workers[data.workerId] = data;
			if (!this.workersHistory[data.workerId]) {
				this.workersHistory[data.workerId] = [];
			}
			this.workersHistory[data.workerId].push({ data, timestamp: Date.now() });
			if (this.workersHistory[data.workerId].length > WORKER_HISTORY_LENGTH) {
				this.workersHistory[data.workerId].shift();
			}
			this.workersLastUpdated[data.workerId] = Date.now();

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
	},
});
