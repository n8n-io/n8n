import type { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
import type { SecretsHelper } from './secrets-helper.ee';

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		hooks?: ExecutionLifecycleHooks;
		secretsHelpers: SecretsHelper;
	}
}

export * from './active-workflows';
export * from './interfaces';
export * from './routing-node';
export * from './node-execution-context';
export * from './partial-execution-utils';
export * from './node-execution-context/utils/execution-metadata';
export * from './workflow-execute';
export { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
export { SecretsHelper } from './secrets-helper.ee';
