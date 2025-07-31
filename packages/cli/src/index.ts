import type { DataStoreService } from './modules/data-store/data-store.service';

export {};

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		dataStoreService?: DataStoreService;
	}
}
