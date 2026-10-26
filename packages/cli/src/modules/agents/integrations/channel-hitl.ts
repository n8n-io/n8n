import type {
	AgentHitlChannelConfiguration,
	AgentHitlChannelDescriptor,
	AgentHitlOptionsPage,
	AgentHitlOptionsQuery,
} from '@n8n/api-types';
import type { HttpRequestClient } from '@n8n/backend-network';
import type { INode } from 'n8n-workflow';

export type ChannelHitlDefinition =
	| { supported: false }
	| {
			supported: true;
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
			resource: 'message',
			operation: 'sendAndWait',
			responseType: 'approval',
			message: '={{ $json.message }}',
			approvalOptions: {
				values: { approvalType: 'double', approveLabel: 'Approve', disapproveLabel: 'Reject' },
			},
			options: { appendAttribution: false },
			...parameters,
		},
	};
}
