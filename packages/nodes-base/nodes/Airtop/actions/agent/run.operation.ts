import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	INode,
} from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import { webhookApiRequest } from '../../transport';

import { validateRequiredStringField } from '../../GenericFunctions';
import { AGENT_MIN_TIMEOUT_SECONDS, ERROR_MESSAGES } from '../../constants';

const displayOptions = {
	show: {
		resource: ['agent'],
		operation: ['run'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Webhook URL',
		name: 'agentWebhook',
		type: 'string',
		required: true,
		default: '',
		description: `Agent webhook URL. Visit your <a href="https://portal.airtop.ai/agents" target="_blank">Agent's page</a> for more information.`,
		displayOptions,
	},
	{
		displayName: 'Parameters',
		name: 'agentParameters',
		type: 'json',
		required: true,
		default: '{}',
		description: `Automation Parameters in JSON format. Visit your <a href="https://portal.airtop.ai/agents" target="_blank">Agent's page</a> for more information.`,
		displayOptions,
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

interface AgentInvocationResponse extends IDataObject {
	invocationId: string;
}

interface AgentResultResponse extends IDataObject {
	status: 'Completed' | 'Running' | 'Failed' | 'Unknown';
	output?: IDataObject;
	error?: string;
}

function throwErrorIf(statement: boolean, message: string, node: INode) {
	if (statement) {
		throw new NodeOperationError(node, message);
	}
}

/**
 * Extracts the agent ID from the webhook URL
 * Format: https://api.airtop.ai/api/hooks/agents/<agentId>/webhooks/...
 */
function extractAgentId(this: IExecuteFunctions, webhookUrl: string): string {
	const match = webhookUrl.match(/\/agents\/([^\/]+)\//);
	throwErrorIf(!match || !match[1], ERROR_MESSAGES.AGENT_INVALID_WEBHOOK_URL, this.getNode());
	return match?.[1] ?? '';
}

async function getAgentStatus(
	this: IExecuteFunctions,
	agentId: string,
	invocationId: string,
): Promise<AgentResultResponse> {
	const resultUrl = `https://api.airtop.ai/api/hooks/agents/${agentId}/invocations/${invocationId}/result`;
	const response = (await webhookApiRequest.call(this, {
		method: 'GET',
		url: resultUrl,
	})) as AgentResultResponse;

	return response;
}

/**
 * Polls the agent execution status until it completes or fails
 */
async function pollAgentStatus(
	this: IExecuteFunctions,
	agentId: string,
	invocationId: string,
	timeoutSeconds: number,
): Promise<AgentResultResponse> {
	const airtopNode = this.getNode();
	const startTime = Date.now();
	const timeoutMs = timeoutSeconds * 1000;
	let response: Partial<AgentResultResponse> = {};

	this.logger.info(`[${airtopNode.name}] Polling agent status for invocationId: ${invocationId}`);

	while (!response?.output) {
		const elapsed = Date.now() - startTime;
		throwErrorIf(elapsed >= timeoutMs, ERROR_MESSAGES.TIMEOUT_REACHED, airtopNode);

		response = await getAgentStatus.call(this, agentId, invocationId);

		if (response?.output) {
			return response as AgentResultResponse;
		}

		// Wait one second before next poll
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return {
		status: 'Unknown',
		output: {},
	};
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const airtopNode = this.getNode();
	const agentWebhook = validateRequiredStringField.call(
		this,
		index,
		'agentWebhook',
		'Agent Webhook',
	);
	const agentParametersJson = validateRequiredStringField.call(
		this,
		index,
		'agentParameters',
		'Parameters',
	);
	const awaitExecution = this.getNodeParameter('awaitExecution', index, true) as boolean;
	const timeout = this.getNodeParameter('timeout', index, 600) as number;

	// Validate timeout
	throwErrorIf(
		timeout < AGENT_MIN_TIMEOUT_SECONDS,
		ERROR_MESSAGES.AGENT_TIMEOUT_INVALID,
		airtopNode,
	);

	const invocationResponse = (await webhookApiRequest.call(this, {
		method: 'POST',
		url: agentWebhook,
		body: jsonParse<IDataObject>(agentParametersJson),
		json: true,
	})) as AgentInvocationResponse;

	const invocationId = invocationResponse.invocationId;
	throwErrorIf(!invocationId, "No 'invocationId' received from agent webhook response", airtopNode);

	if (!awaitExecution) {
		return this.helpers.returnJsonArray({
			invocationId,
		});
	}

	// Poll for execution status if awaitExecution is true
	const agentId = extractAgentId.call(this, agentWebhook);
	const result = await pollAgentStatus.call(this, agentId, invocationId, timeout);
	throwErrorIf(
		Boolean(result?.error),
		`${result?.error || 'Unknown error'}. Agent Invocation ID: ${invocationId}`,
		airtopNode,
	);

	return this.helpers.returnJsonArray({
		invocationId,
		status: result?.status ?? 'Unknown',
		output: result?.output ?? {},
	});
}
