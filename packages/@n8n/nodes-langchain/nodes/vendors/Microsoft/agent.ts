import type {
	AuthConfiguration,
	DefaultConversationState,
	DefaultUserState,
	TurnContext,
	TurnState,
	CloudAdapter,
} from '@microsoft/agents-hosting';

import {
	MemoryStorage,
	// AttachmentDownloader,
	AgentApplication,
} from '@microsoft/agents-hosting';
import { NodeOperationError, type IWebhookFunctions } from 'n8n-workflow';
import { ms365AgentExecute } from './utils';
import {
	type AgentDetails,
	ExecutionType,
	type InvokeAgentDetails,
	InvokeAgentScope,
	type TenantDetails,
	BaggageBuilder,
	ObservabilityManager,
	type Builder,
} from '@microsoft/agents-a365-observability';
import { getObservabilityAuthenticationScope } from '@microsoft/agents-a365-runtime';
import { type Activity, ActivityTypes } from '@microsoft/agents-activity';

export function createAgent(agentNode: IWebhookFunctions, adapter: CloudAdapter) {
	const storage = new MemoryStorage();

	const agentApplication: AgentApplication<TurnState> = new AgentApplication<TurnState>({
		adapter,
		storage,
		authorization: {
			agentic: {
				type: 'agentic',
				scopes: ['https://graph.microsoft.com/.default'],
			},
		},
	});

	const welcomeMessage = agentNode.getNodeParameter(
		'welcomeMessage',
		"Hello! I'm here to help you!",
	) as string;

	agentApplication.onConversationUpdate('membersAdded', async (context) => {
		await context.sendActivity(welcomeMessage);
	});

	return agentApplication;
}

export const onActivityConfig = (
	agentNode: IWebhookFunctions,
	credentials: { clientId?: string; tenantId?: string },
	mcpTokenRef: { token: string | undefined },
) => {
	const responseFeedback = agentNode.getNodeParameter('responseFeedback', false) as boolean;
	const agentDescription = agentNode.getNodeParameter('agentDescription') as string;
	const { clientId, tenantId } = credentials;

	return async (turnContext: TurnContext) => {
		const mcpAuthToken = mcpTokenRef.token;

		const agentInfo: AgentDetails = {
			agentId: (turnContext.activity.recipient as any)?.agenticAppId ?? clientId,
			agentName: (turnContext.activity.recipient as any)?.name ?? 'Microsoft Agent',
		};

		const tenantDetails: TenantDetails = {
			tenantId: (turnContext.activity.recipient as any)?.tenantId ?? tenantId ?? '',
		};

		const baggageScope = new BaggageBuilder()
			.tenantId(tenantDetails.tenantId)
			.agentId(agentInfo.agentId)
			.correlationId('7ff6dca0-917c-4bb0-b31a-794e533d8aad') // TODO: add correlationId - can be any uuid generated on the spot
			.agentName(agentInfo.agentName)
			.conversationId(turnContext.activity.conversation?.id)
			.build();

		await baggageScope.run(async () => {
			const invokeAgentDetails: InvokeAgentDetails = {
				agentId: agentInfo.agentId,
				agentName: agentInfo.agentName,
				conversationId: turnContext.activity.conversation?.id,
				request: {
					content: turnContext.activity.text || 'Unknown text',
					executionType: ExecutionType.HumanToAgent,
					sessionId: turnContext.activity.conversation?.id,
				},
			};

			const invokeAgentScope = InvokeAgentScope.start(invokeAgentDetails, tenantDetails);

			await invokeAgentScope.withActiveSpanAsync(async () => {
				invokeAgentScope.recordInputMessages([turnContext.activity.text ?? 'Unknown text']);

				try {
					let llmResponse: string;

					if (!responseFeedback) {
						llmResponse = await ms365AgentExecute(
							agentNode,
							turnContext,
							agentDescription,
							{
								configurable: { thread_id: turnContext.activity.conversation!.id },
							},
							mcpAuthToken,
						);

						invokeAgentScope.recordOutputMessages([`n8n Response: ${llmResponse}`]);

						await turnContext.sendActivity(llmResponse);
						return;
					}

					turnContext.streamingResponse.setFeedbackLoop(true);
					turnContext.streamingResponse.setSensitivityLabel({
						type: 'https://schema.org/Message',
						'@type': 'CreativeWork',
						name: 'Internal',
					});
					turnContext.streamingResponse.setGeneratedByAILabel(true);
					turnContext.streamingResponse.queueInformativeUpdate('Processing your request...');

					llmResponse = await ms365AgentExecute(
						agentNode,
						turnContext,
						agentDescription,
						{
							configurable: { thread_id: turnContext.activity.conversation!.id },
						},
						mcpAuthToken,
					);

					invokeAgentScope.recordOutputMessages([`n8n Response: ${llmResponse}`]);

					turnContext.streamingResponse.queueTextChunk(llmResponse);
					await turnContext.streamingResponse.endStream();
				} finally {
					invokeAgentScope.dispose();
				}
			});
		});
	};
};

export function adapterProcessCallbackConfig(
	agentNode: IWebhookFunctions,
	agent: AgentApplication<TurnState<DefaultConversationState, DefaultUserState>>,
	authConfig: AuthConfiguration,
	data: {
		inputText: string;
		activities: string[];
	},
) {
	return async (turnContext: TurnContext) => {
		const { token: aauToken } = await agent.authorization.exchangeToken(
			turnContext,
			getObservabilityAuthenticationScope(),
			'agentic',
		);

		const observability = ObservabilityManager.configure(
			(builder: Builder) =>
				builder
					.withService('TypeScript Sample Agent', '1.0.0')
					.withTokenResolver((_agentId: string, _tenantId: string) => aauToken || '')
					.withClusterCategory('preprod'), // Use 'prod' for production tenants
		);

		observability.start();

		const mcpTokenRef = { token: undefined as string | undefined };

		try {
			const tokenResult = await agent.authorization.getToken(turnContext, 'agentic');
			mcpTokenRef.token = tokenResult.token;
		} catch (error) {
			console.error('Error getting MCP token with getToken:', error);
		}

		try {
			const originalSendActivity = turnContext.sendActivity.bind(turnContext);
			data.inputText = turnContext.activity.text || '';
			const sendActivityWrapper = async (activityOrText: string | Activity) => {
				if (typeof activityOrText === 'string') {
					data.activities.push(activityOrText);
				} else if (activityOrText.text) {
					data.activities.push(activityOrText.text);
				}
				return await originalSendActivity(activityOrText);
			};

			turnContext.sendActivity = sendActivityWrapper;

			const onActivity = onActivityConfig(agentNode, authConfig, mcpTokenRef);
			agent.onActivity(ActivityTypes.Message, onActivity, ['agentic']);

			await agent.run(turnContext);
		} catch (error) {
			throw new NodeOperationError(agentNode.getNode(), error);
		} finally {
			await observability.shutdown();
		}
	};
}
