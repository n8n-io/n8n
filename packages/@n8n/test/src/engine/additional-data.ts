import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { ExecutionSetup } from '../execution-context';
import { TestCredentialsHelper } from '../instance-state/credentials-helper';
import { createExternalSecretsProxy, createVariables } from '../instance-state/expression-values';
import { startRunnerTask } from '../runtime/code-runner';
import { refuseSubWorkflow } from '../runtime/refusals';
import { createNodeHandler } from './node-handler';

const BASE_URL = 'http://localhost:5678';

export function createAdditionalData(context: ExecutionSetup): IWorkflowExecuteAdditionalData {
	return {
		executionId: context.executionId,
		hooks: context.hooks,
		credentialsHelper: new TestCredentialsHelper(context),
		evalNodeMockHandler: createNodeHandler(context),
		externalSecretsProxy: createExternalSecretsProxy(context),
		variables: createVariables(context),
		currentNodeExecutionIndex: 0,
		executeWorkflow: async (_workflowInfo, _additionalData, { node }) =>
			refuseSubWorkflow(context, node),
		startRunnerTask: async (...args) => await startRunnerTask(context, args),
		getRunExecutionData: async () => undefined,
		getRuntimeCredential: async () => undefined,
		logAiEvent: () => {},
		restApiUrl: `${BASE_URL}/rest`,
		instanceBaseUrl: BASE_URL,
		formBaseUrl: `${BASE_URL}/form`,
		formWaitingBaseUrl: `${BASE_URL}/form-waiting`,
		formTestBaseUrl: `${BASE_URL}/form-test`,
		webhookBaseUrl: `${BASE_URL}/webhook`,
		webhookWaitingBaseUrl: `${BASE_URL}/webhook-waiting`,
		webhookTestBaseUrl: `${BASE_URL}/webhook-test`,
		mcpBaseUrl: `${BASE_URL}/mcp`,
		mcpTestBaseUrl: `${BASE_URL}/mcp-test`,
	};
}
