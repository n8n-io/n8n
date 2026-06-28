import type { SsrfBridge } from '@n8n/backend-network';
import type {
	DataTableProxyProvider,
	DynamicCredentialCheckProxyProvider,
	IExecutionContext,
	IHttpRequestOptions,
	INode,
	IWorkflowSettings,
	OauthJweProxyProvider,
} from 'n8n-workflow';

import type { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
import type { ExternalSecretsProxy } from './external-secrets-proxy';

/** Standardized mock HTTP response returned by the eval mock handler. */
export interface EvalMockHttpResponse {
	body: unknown;
	headers: Record<string, string>;
	statusCode: number;
}

/**
 * Handler for LLM-based HTTP mocking during evaluation.
 * Receives the fully-built request (after credential auth) and the executing node.
 * Return a full mock response, or `undefined` to pass through to real HTTP.
 */
export type EvalLlmMockHandler = (
	requestOptions: IHttpRequestOptions,
	node: INode,
) => Promise<EvalMockHttpResponse | undefined>;

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
		/**
		 * LLM-based HTTP mock handler for evaluation mode.
		 * When set, HTTP requests from service nodes are intercepted and routed
		 * through this handler instead of making real API calls.
		 * Only set by the eval execution service — never present in normal executions.
		 */
		evalLlmMockHandler?: EvalLlmMockHandler;
		'data-table'?: { dataTableProxyProvider: DataTableProxyProvider };
		'dynamic-credentials'?: { credentialCheckProxy: DynamicCredentialCheckProxyProvider };
		'oauth-jwe'?: { oauthJweProxyProvider: OauthJweProxyProvider };
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
		/** Encrypted credential context for a manual editor-triggered execution. */
		encryptedRunnerIdentity?: string;
	}

	interface IWorkflowExecutionDataProcess {
		/**
		 * Invoked by `WorkflowRunner` once `additionalData` is fully built, just
		 * before the workflow runs. Function fields don't survive queue
		 * serialization, so callers using this hook must stay on the main process.
		 *
		 * @internal
		 */
		configureAdditionalData?: (
			additionalData: IWorkflowExecuteAdditionalData,
		) => Promise<void> | void;
	}
}

export * from './active-workflow-triggers';
export {
	synthesizeBinaryFixture,
	type FixtureSizeHint,
	type SynthesizeBinaryFixtureOptions,
} from './eval-mock-fixtures';
export { establishExecutionContext } from './execution-context';
export * from './execution-context-hook-registry.service';
export { ExecutionContextService } from './execution-context.service';
export { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
export { ExternalSecretsProxy, type IExternalSecretsManager } from './external-secrets-proxy';
export type * from './interfaces';
export * from './node-execution-context';
export * from './node-execution-context/utils/execution-metadata';
export * from './partial-execution-utils';
export { PollTriggerExecutor } from './poll-trigger-executor';
export { isEngineRequest } from './requests-response';
export * from './routing-node';
export * from './scheduled-task-manager';
export * from './workflow-execute';
// Exposed so eval-mode credential helpers (e.g. `EvalMockedCredentialsHelper`)
// can reuse the same schema-driven cred synthesizer the wire-server URL
// rewrite expects. See its `getDecrypted` catch path for the consumer.
export { buildEvalMockCredentials } from './eval-mock-helpers';
