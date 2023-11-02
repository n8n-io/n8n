import { defineStore } from 'pinia';
import type { IPushDataWorkerStatusPayload } from '../Interface';
import { makeRestApiRequest } from '../utils/apiUtils';
import { useRootStore } from './n8nRoot.store';

const GET_STATUS_ENDPOINT = '/orchestration//worker/status';
const HISTORY_LENGTH = 100;
const STALE_SECONDS = 120 * 1000;

export interface IOrchestrationStoreState {
	workers: { [id: string]: IPushDataWorkerStatusPayload };
	workersHistory: {
		[id: string]: IWorkerHistoryItem[];
	};
	workersLastUpdated: { [id: string]: number };
	statusInterval: NodeJS.Timer | null;
}

export interface IWorkerHistoryItem {
	timestamp: number;
	data: IPushDataWorkerStatusPayload;
}

export const useOrchestrationStore = defineStore('orchestrationManager', {
	state: (): IOrchestrationStoreState => ({
		workers: {},
		workersHistory: {},
		workersLastUpdated: {},
		statusInterval: null,
	}),
	actions: {
		updateWorkerStatus(data: IPushDataWorkerStatusPayload) {
			this.workers[data.workerId] = data;
			if (!this.workersHistory[data.workerId]) {
				this.workersHistory[data.workerId] = [];
			}
			this.workersHistory[data.workerId].push({ data, timestamp: Date.now() });
			if (this.workersHistory[data.workerId].length > HISTORY_LENGTH) {
				this.workersHistory[data.workerId].shift();
			}
			this.workersLastUpdated[data.workerId] = Date.now();
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
					await makeRestApiRequest(rootStore.getRestApiContext, 'POST', GET_STATUS_ENDPOINT);
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
		getWorkerStatus(workerId: string): IPushDataWorkerStatusPayload | undefined {
			return this.workers[workerId];
		},
		getWorkerStatusHistory(workerId: string): IWorkerHistoryItem[] {
			return this.workersHistory[workerId] ?? [];
		},
	},
});
