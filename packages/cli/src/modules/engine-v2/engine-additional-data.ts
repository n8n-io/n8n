import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import { ExternalSecretsProxy } from 'n8n-core';
import type {
	EnvProviderState,
	ICredentialsHelper,
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { UrlService } from '@/services/url.service';
import { TaskRequester } from '@/task-runners/task-managers/task-requester';

/** A capability the data plane does not have yet. The step that reaches it fails and says why. */
function unimplemented(feature: string) {
	return async (): Promise<never> => {
		throw new UnimplementedError(`${feature} is not supported on Engine 2.0 yet`);
	};
}

/**
 * Builds the v1 `additionalData` for a step that runs on the engine 2.0 data
 * plane. Reads config only: the data plane has no control plane database, so
 * nothing here may query one. Both engine modes use it, so in-process mode
 * cannot hide a control plane dependency that the container would lack.
 */
@Service()
export class EngineAdditionalDataBuilder {
	constructor(
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly eventService: EventService,
		private readonly externalSecretsProxy: ExternalSecretsProxy,
	) {}

	build(
		context: AdditionalDataContext,
		credentialsHelper: ICredentialsHelper,
	): IWorkflowExecuteAdditionalData {
		const webhookBase = this.urlService.getWebhookBaseUrl();
		const testWebhookBase = this.urlService.getTestWebhookBaseUrl();
		const { endpoints } = this.globalConfig;
		const { eventService } = this;

		return {
			currentNodeExecutionIndex: 0,
			credentialsHelper,
			// The task runner keys its tasks by execution id, so it needs the engine's
			// id to cancel them. `$execution.id` also reads it.
			executionId: context.executionId,
			workflowId: context.workflowId,
			userId: context.userId,
			projectId: context.projectId,
			restApiUrl: webhookBase + endpoints.rest,
			instanceBaseUrl: `${this.urlService.getInstanceBaseUrl()}/`,
			formBaseUrl: webhookBase + endpoints.form,
			formWaitingBaseUrl: webhookBase + endpoints.formWaiting,
			formTestBaseUrl: testWebhookBase + endpoints.formTest,
			webhookBaseUrl: webhookBase + endpoints.webhook,
			webhookWaitingBaseUrl: webhookBase + endpoints.webhookWaiting,
			webhookTestBaseUrl: testWebhookBase + endpoints.webhookTest,
			mcpBaseUrl: webhookBase + endpoints.mcp,
			mcpTestBaseUrl: testWebhookBase + endpoints.mcpTest,
			// Variables live in the control plane database. Empty until the control
			// plane serves them, so `$vars.x` reads `undefined` instead of failing.
			variables: {},
			externalSecretsProxy: this.externalSecretsProxy,
			logAiEvent: (eventName, payload) => {
				eventService.emit(eventName, payload);
			},
			logHitlResponse: (payload) => {
				eventService.emit('hitl-response-actioned', payload);
			},
			async startRunnerTask(
				additionalData: IWorkflowExecuteAdditionalData,
				jobType: string,
				settings: unknown,
				executeFunctions: IExecuteFunctions,
				inputData: ITaskDataConnections,
				node: INode,
				workflow: Workflow,
				runExecutionData: IRunExecutionData,
				runIndex: number,
				itemIndex: number,
				activeNodeName: string,
				connectionInputData: INodeExecutionData[],
				siblingParameters: INodeParameters,
				mode: WorkflowExecuteMode,
				envProviderState: EnvProviderState,
				executeData?: IExecuteData,
			) {
				// Resolved per call: the task runner module binds the requester after
				// this builder is constructed.
				return await Container.get(TaskRequester).startTask(
					additionalData,
					jobType,
					settings,
					executeFunctions,
					inputData,
					node,
					workflow,
					runExecutionData,
					runIndex,
					itemIndex,
					activeNodeName,
					connectionInputData,
					siblingParameters,
					mode,
					envProviderState,
					executeData,
				);
			},
			executeWorkflow: unimplemented('Sub-workflows (executeWorkflow)'),
			executeAgent: unimplemented('Agents (executeAgent)'),
			listAgents: unimplemented('Agents (listAgents)'),
			getRunExecutionData: unimplemented('Reading another execution (getRunExecutionData)'),
			getRuntimeCredential: unimplemented('Runtime credentials (getRuntimeCredential)'),
			setExecutionStatus: () => {
				throw new UnimplementedError(
					'Setting the execution status from a node (setExecutionStatus) is not supported on Engine 2.0 yet',
				);
			},
		};
	}
}
