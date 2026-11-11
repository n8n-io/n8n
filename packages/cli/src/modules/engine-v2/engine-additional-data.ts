import { SsrfProtectionService } from '@n8n/backend-network';
import { EventService, UrlService } from '@n8n/backend-services';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import { ExternalSecretsProxy } from 'n8n-core';

import { TaskRequester } from '@/task-runners/task-managers/task-requester';
import type {
	DataTableProxyProvider,
	ICredentialsHelper,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

/** A capability the data plane does not have yet. The step that reaches it fails and says why. */
function unimplemented(feature: string) {
	return async (): Promise<never> => {
		throw new UnimplementedError(`${feature} is not supported on Engine v2 yet`);
	};
}

/**
 * Stands in for `$vars` on the data plane, which has no variables: they live
 * in the control plane database. Three rules make it safe to hand around:
 *
 * - A read of a named variable throws, so `$vars.x` in an expression fails
 *   loudly instead of resolving to `undefined`.
 * - Enumeration finds nothing, so the task broker can serialize the additional
 *   data for a runner. A Code node then sees an empty `$vars`, as it does on a
 *   v1 instance without variables.
 * - Symbols, own properties and `toJSON` pass through, because serializers and
 *   inspectors probe them before they read anything.
 */
const variablesPlaceholder: IWorkflowExecuteAdditionalData['variables'] = new Proxy(
	{},
	{
		get: (target, property) => {
			if (
				typeof property === 'symbol' ||
				Object.hasOwn(target, property) ||
				property === 'toJSON'
			) {
				return Reflect.get(target, property);
			}
			throw new UnimplementedError('Variables ($vars) are not supported on Engine v2 yet');
		},
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
		private readonly taskRequester: TaskRequester,
	) {}

	build(
		context: AdditionalDataContext,
		credentialsHelper: ICredentialsHelper,
		dataTableProxyProvider: DataTableProxyProvider,
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
			variables: variablesPlaceholder,
			externalSecretsProxy: unimplementedExternalSecretsProxy,
			// The key the Data Table node's helpers look for. In v1 the data-table
			// module fills it; here the provider asks the control plane.
			'data-table': { dataTableProxyProvider },
			logAiEvent: (eventName, payload) => {
				eventService.emit(eventName, payload);
			},
			logHitlResponse: (payload) => {
				eventService.emit('hitl-response-actioned', payload);
			},
			// The Code node's work goes to the task broker this process hosts, as on v1.
			getRunnerStatus: (taskType) => this.taskRequester.getRunnerStatus(taskType),
			startRunnerTask: async (...args) => await this.taskRequester.startTask(...args),
			executeWorkflow: unimplemented('Sub-workflows (executeWorkflow)'),
			executeAgent: unimplemented('Agents (executeAgent)'),
			listAgents: unimplemented('Agents (listAgents)'),
			// The Execute Sub-workflow node reads the sub-execution's run data to trace paired
			// items through it. The data plane has no v1 run data for a sub-execution. The shim
			// drops the sub-execution items' own marks, so the node pairs them by index.
			getRunExecutionData: async () => undefined,
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
