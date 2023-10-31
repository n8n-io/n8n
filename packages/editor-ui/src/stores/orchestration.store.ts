import { defineStore } from 'pinia';
import type { IPushDataWorkerStatusPayload } from '../Interface';
import { makeRestApiRequest } from '../utils/apiUtils';
import { useRootStore } from './n8nRoot.store';

const GET_STATUS_ENDPOINT = '/orchestration//worker/status';

export interface IOrchestrationStoreState {
	workers: { [id: string]: IPushDataWorkerStatusPayload };
	workersLastUpdated: { [id: string]: number };
	statusInterval: NodeJS.Timer | null;
}
export const useOrchestrationStore = defineStore('orchestrationManager', {
	state: (): IOrchestrationStoreState => ({
		workers: {},
		workersLastUpdated: {},
		statusInterval: null,
	}),
	actions: {
		updateWorkerStatus(data: IPushDataWorkerStatusPayload) {
			this.workers[data.workerId] = data;
			this.workersLastUpdated[data.workerId] = Date.now();
		},
		removeStaleWorkers() {
			for (const id in this.workersLastUpdated) {
				if (this.workersLastUpdated[id] + 20000 < Date.now()) {
					delete this.workers[id];
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
	},
});
