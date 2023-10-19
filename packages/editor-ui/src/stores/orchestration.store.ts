import { defineStore } from 'pinia';
import type { IPushDataWorkerStatusPayload } from '../Interface';

export interface IOrchestrationStoreState {
	workers: Record<string, IPushDataWorkerStatusPayload>;
}
export const useOrchestrationStore = defineStore('orchestrationManager', {
	state: (): IOrchestrationStoreState => ({
		workers: {},
	}),
	actions: {
		updateWorkerStatus(data: IPushDataWorkerStatusPayload) {
			this.workers[data.workerId] = data;
		},
	},
});
