import type {
	AgentHitlChannel,
	AgentHitlChannelConfiguration,
	AgentHitlChannelDescriptor,
	AgentHitlOptionsPage,
	AgentHitlOptionsQuery,
} from '@n8n/api-types';
import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionEvent } from 'chat';
import { isResourceLocatorValue, type INode, type NodeParameterValueType } from 'n8n-workflow';
import { isRecord } from '@n8n/utils/is-record';

export type ChannelHitlDefinition =
	| { supported: false }
	| {
			supported: true;
			channel: AgentHitlChannel;
			nodeType: string;
			credentialType: string;
			matchesResponse: (node: INode, event: ActionEvent) => boolean;
			fields: AgentHitlChannelDescriptor['fields'];
			listOptions: (context: {
				credential: Record<string, unknown>;
				httpClient: HttpRequestClient;
				query: AgentHitlOptionsQuery;
			}) => Promise<AgentHitlOptionsPage>;
			createNode: (configuration: AgentHitlChannelConfiguration) => INode;
	  };

export function approvalNode(
	type: string,
	version: number,
	credentialType: string,
	configuration: AgentHitlChannelConfiguration,
	parameters: INode['parameters'],
): INode {
	return {
		id: 'agent-channel-approval',
		name: 'Request approval',
		type,
		typeVersion: version,
		position: [320, 0],
		credentials: {
			[credentialType]: { id: configuration.credentialId, name: configuration.channel },
		},
		parameters: {
			agentApproval: true,
			resource: 'message',
			operation: 'sendAndWait',
			responseType: 'approval',
			message: '={{ $json.message }}',
			approvalOptions: {
				values: { approvalType: 'double', approveLabel: 'Approve', disapproveLabel: 'Deny' },
			},
			options: { appendAttribution: false },
			...parameters,
		},
	};
}

export function matchesApprovalUser(
	destination: NodeParameterValueType,
	event: ActionEvent,
): boolean {
	const id = isResourceLocatorValue(destination) ? destination.value : destination;
	return (typeof id === 'string' || typeof id === 'number') && String(id) === event.user.userId;
}

export function matchesApprovalChannel(
	destination: NodeParameterValueType,
	event: ActionEvent,
): boolean {
	if (!isResourceLocatorValue(destination)) return false;
	try {
		const thread = event.adapter.decodeThreadId(event.threadId);
		return isRecord(thread) && destination.value === (thread.channel ?? thread.channelId);
	} catch {
		return false;
	}
}
