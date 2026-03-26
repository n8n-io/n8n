import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import type { AgentInvocationResponse, AgentParametersInput } from './agent.types';
import {
	getAgentDetails,
	pollAgentStatus,
	throwOperationErrorIf,
	validateAgentParameters,
} from './agent.utils';
import { AGENT_MIN_TIMEOUT_SECONDS, AIRTOP_HOOKS_BASE_URL, ERROR_MESSAGES } from '../../constants';
import { apiRequest } from '../../transport';

const displayOptions = {
	show: {
		resource: ['agent'],
		operation: ['run'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'The Airtop agent to run. Visit <a href="https://portal.airtop.ai/agents" target="_blank">Airtop Agents</a> for more information.',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['run'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an Agent...',
				typeOptions: {
					searchListMethod: 'listSearchAgents',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. agent_abc123',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.+',
							errorMessage: 'Agent ID cannot be empty',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Agent Parameters',
		name: 'agentParameters',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: ['agentId.value'],
			resourceMapper: {
				resourceMapperMethod: 'agentsResourceMapping',
				mode: 'map',
				supportAutoMap: false,
				addAllFields: true,
				noFieldsError: 'No input parameters found for the selected agent',
				multiKeyMatch: false,
				allowEmptyValues: true,
				fieldWords: {
					singular: 'parameter',
					plural: 'parameters',
				},
			},
		},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['run'],
			},
			hide: {
				agentId: [''],
			},
		},
	},
	{
		displayName: 'Await Agent',
		name: 'awaitExecution',
		type: 'boolean',
		default: true,
		description: 'Whether to wait for the agent to complete its execution',
		displayOptions,
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		default: 600,
		description: 'Timeout in seconds to wait for the agent to finish',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['run'],
				awaitExecution: [true],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const airtopNode = this.getNode();
	const agentId = this.getNodeParameter('agentId', index, '', {
		extractValue: true,
	}) as string;

	const agentParameters = this.getNodeParameter(
		'agentParameters',
		index,
		{},
	) as AgentParametersInput;

	const awaitExecution = this.getNodeParameter('awaitExecution', index, true) as boolean;

	const timeout = this.getNodeParameter('timeout', index, 600) as number;

	// Validate timeout
	throwOperationErrorIf(
		timeout < AGENT_MIN_TIMEOUT_SECONDS,
		ERROR_MESSAGES.AGENT_TIMEOUT_INVALID,
		airtopNode,
	);

	// Convert fixedCollection parameters to API format
	const validatedAgentParameters = validateAgentParameters.call(this, agentParameters);

	const { webhookId } = await getAgentDetails.call(this, agentId);
	const invokeUrl = `${AIRTOP_HOOKS_BASE_URL}/agents/${agentId}/webhooks/${webhookId}`;

	const invocationResponse = await apiRequest.call<
		IExecuteFunctions,
		['POST', string, IDataObject],
		Promise<AgentInvocationResponse>
	>(this, 'POST', invokeUrl, validatedAgentParameters);

	const invocationId = invocationResponse.invocationId;
	throwOperationErrorIf(
		!invocationId,
		"No 'invocationId' received from agent webhook response",
		airtopNode,
	);

	if (!awaitExecution) {
		return this.helpers.returnJsonArray({
			invocationId,
		});
	}

	// Poll for agent's execution status
	const result = await pollAgentStatus.call(this, agentId, invocationId, timeout);
	throwOperationErrorIf(
		Boolean(result?.error),
		`${result?.error ?? 'Unknown error'}. Agent Invocation ID: ${invocationId}`,
		airtopNode,
	);

	return this.helpers.returnJsonArray({
		invocationId,
		status: result?.status ?? 'Unknown',
		output: result?.output ?? {},
	});
}
