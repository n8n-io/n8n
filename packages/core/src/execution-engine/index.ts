import type { DataStoreProxyProvider } from 'n8n-workflow';

import type { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
import type { ExternalSecretsProxy } from './external-secrets-proxy';

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		hooks?: ExecutionLifecycleHooks;
		externalSecretsProxy: ExternalSecretsProxy;
		'data-table'?: { dataStoreProxyProvider: DataStoreProxyProvider };
		// Project ID is currently only added on the additionalData if the user
		// has data table listing permission for that project. We should consider
		// that only data tables belonging to their respective projects are shown.
		dataTableProjectId?: string;
	}
}

export * from './active-workflows';
export type * from './interfaces';
export * from './routing-node';
export * from './node-execution-context';
export * from './partial-execution-utils';
export * from './node-execution-context/utils/execution-metadata';
export * from './workflow-execute';
export { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
export { ExternalSecretsProxy, type IExternalSecretsManager } from './external-secrets-proxy';
