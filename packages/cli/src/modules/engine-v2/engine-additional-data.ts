import { SsrfProtectionService } from '@n8n/backend-network';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import { ExternalSecretsProxy } from 'n8n-core';
import type { ICredentialsHelper, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { UrlService } from '@/services/url.service';

/** A capability the data plane does not have yet. The step that reaches it fails and says why. */
function unimplemented(feature: string) {
	return async (): Promise<never> => {
		throw new UnimplementedError(`${feature} is not supported on Engine v2 yet`);
	};
}

/**
 * `$vars` that fails on first read. Variables live in the control plane
 * database, and an empty object would turn `$vars.x` into a silent `undefined`
 * inside a request or a parameter.
 */
const unimplementedVariablesAccess = (): never => {
	throw new UnimplementedError('Variables ($vars) are not supported on Engine v2 yet');
};

const unimplementedVariables: IWorkflowExecuteAdditionalData['variables'] = new Proxy(
	{},
	{
		get: unimplementedVariablesAccess,
		ownKeys: unimplementedVariablesAccess,
		has: unimplementedVariablesAccess,
		getOwnPropertyDescriptor: unimplementedVariablesAccess,
	},
);

class UnimplementedExternalSecretsProxy extends ExternalSecretsProxy {
	private unavailable(): never {
		throw new UnimplementedError('External secrets ($secrets) are not supported on Engine v2 yet');
	}

	override getSecret(): never {
		return this.unavailable();
	}

	override hasSecret(): never {
		return this.unavailable();
	}

	override hasProvider(): never {
		return this.unavailable();
	}

	override listProviders(): never {
		return this.unavailable();
	}

	override listSecrets(): never {
		return this.unavailable();
	}
}

const unimplementedExternalSecretsProxy = new UnimplementedExternalSecretsProxy();

/**
 * Builds the v1 `additionalData` for a step that runs on the engine v2 data
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
		private readonly ssrfProtectionConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
	) {}

	build(
		context: AdditionalDataContext,
		credentialsHelper: ICredentialsHelper,
	): IWorkflowExecuteAdditionalData {
		const webhookBase = this.urlService.getWebhookBaseUrl();
		const testWebhookBase = this.urlService.getTestWebhookBaseUrl();
		const { endpoints } = this.globalConfig;
		const { eventService } = this;

		const additionalData: IWorkflowExecuteAdditionalData = {
			currentNodeExecutionIndex: 0,
			credentialsHelper,
			// `$execution.id` reads the engine's id.
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
			variables: unimplementedVariables,
			externalSecretsProxy: unimplementedExternalSecretsProxy,
			logAiEvent: (eventName, payload) => {
				eventService.emit(eventName, payload);
			},
			logHitlResponse: (payload) => {
				eventService.emit('hitl-response-actioned', payload);
			},
			// The data plane runs no task runner, so the Code node has nowhere to send
			// work. Python asks first and gets "unavailable" with no reason, since the
			// node maps reasons to Python install problems; JavaScript reaches
			// `startRunnerTask` and fails there.
			getRunnerStatus: () => ({ available: false }),
			startRunnerTask: unimplemented('Task runners (Code node)'),
			executeWorkflow: unimplemented('Sub-workflows (executeWorkflow)'),
			executeAgent: unimplemented('Agents (executeAgent)'),
			listAgents: unimplemented('Agents (listAgents)'),
			getRunExecutionData: unimplemented('Reading another execution (getRunExecutionData)'),
			getRuntimeCredential: unimplemented('Runtime credentials (getRuntimeCredential)'),
			setExecutionStatus: () => {
				throw new UnimplementedError(
					'Setting the execution status from a node (setExecutionStatus) is not supported on Engine v2 yet',
				);
			},
		};

		if (this.ssrfProtectionConfig.enabled) {
			additionalData.ssrfBridge = this.ssrfProtectionService;
		}

		return additionalData;
	}
}
