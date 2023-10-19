import { defineStore } from 'pinia';
import type { IPushDataWorkerStatusPayload } from '../Interface';

export interface IOrchestrationStoreState {
	workers: { [id: string]: IPushDataWorkerStatusPayload };
}
export const useOrchestrationStore = defineStore('orchestrationManager', {
	state: (): IOrchestrationStoreState => ({
		workers: {},
	}),
	actions: {
		updateWorkerStatus(data: IPushDataWorkerStatusPayload) {
			console.log('updateWorkerStatus', data);
			this.workers[data.workerId] = data;
		},
	},
});
