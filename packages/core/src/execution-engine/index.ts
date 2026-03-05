import type {
	DataTableProxyProvider,
	DynamicCredentialCheckProxyProvider,
	IExecutionContext,
	IWorkflowSettings,
	Result,
} from 'n8n-workflow';
import type { LookupFunction } from 'node:net';

import type { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
import type { ExternalSecretsProxy } from './external-secrets-proxy';

export type SsrfCheckResult = Result<void, Error>;

/**
 * Narrow interface for SSRF protection, satisfied structurally by SsrfProtectionService.
 * Defined here so packages/core can use it without importing from packages/cli.
 */
export interface SsrfBridge {
	validateIp(ip: string): SsrfCheckResult;
	validateUrl(url: string | URL): Promise<SsrfCheckResult>;
	validateRedirectSync(url: string): void;
	createSecureLookup(): LookupFunction;
}

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		hooks?: ExecutionLifecycleHooks;
		externalSecretsProxy: ExternalSecretsProxy;
		/**
		 * The providerKeys of the external secret connections
		 * that are either global or shared with the project
		 * that owns the credential to decrypt.
		 */
		externalSecretProviderKeysAccessibleByCredential?: Set<string>;
		/** SSRF protection bridge — present only when N8N_SSRF_PROTECTION_ENABLED=true */
		ssrfBridge?: SsrfBridge;
		'data-table'?: { dataTableProxyProvider: DataTableProxyProvider };
		'dynamic-credentials'?: { credentialCheckProxy: DynamicCredentialCheckProxyProvider };
		// Project ID is currently only added on the additionalData if the user
		// has data table listing permission for that project. We should consider
		// that only data tables belonging to their respective projects are shown.
		dataTableProjectId?: string;
		/**
		 * Execution context for dynamic credential resolution (EE feature).
		 * Contains encrypted credential context that can be decrypted by resolvers.
		 */
		executionContext?: IExecutionContext;
		/**
		 * Workflow settings (EE feature).
		 * Contains workflow-level configuration including credential resolver ID.
		 */
		workflowSettings?: IWorkflowSettings;
	}
}

export * from './active-workflows';
export type * from './interfaces';
export * from './routing-node';
export * from './node-execution-context';
export * from './partial-execution-utils';
export * from './node-execution-context/utils/execution-metadata';
export * from './workflow-execute';
export * from './execution-context-hook-registry.service';
export { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
export { ExternalSecretsProxy, type IExternalSecretsManager } from './external-secrets-proxy';
export { ExecutionContextService } from './execution-context.service';
export { isEngineRequest } from './requests-response';
