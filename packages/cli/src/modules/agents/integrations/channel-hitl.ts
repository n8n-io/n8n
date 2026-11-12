import type {
	AgentHitlChannel,
	AgentHitlChannelConfiguration,
	AgentHitlChannelDescriptor,
	AgentHitlOptionsPage,
	AgentHitlOptionsQuery,
	AgentHitlOption,
} from '@n8n/api-types';
import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionEvent } from 'chat';
import {
	isResourceLocatorValue,
	jsonParse,
	type INode,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from '@n8n/errors';
import { z } from 'zod';

export type ChannelHitlDefinition =
	| { supported: false }
	| {
			supported: true;
			channel: AgentHitlChannel;
			nodeType: string;
			credentialType: string;
			matchesResponse: (node: INode, event: ActionEvent) => boolean;
			fields: AgentHitlChannelDescriptor['fields'];
			listOptions: (context: ChannelHitlOptionsContext) => Promise<AgentHitlOptionsPage>;
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

export interface ChannelHitlOptionsContext {
	credential: Record<string, unknown>;
	httpClient: HttpRequestClient;
	query: AgentHitlOptionsQuery;
}

const recipientCursor = z
	.object({ channel: z.string().optional(), user: z.string().optional() })
	.strict();

/** Page each recipient list independently so both destination types remain searchable. */
export async function listReviewRecipients(
	cursor: string | undefined,
	load: (kind: 'channel' | 'user', cursor?: string) => Promise<AgentHitlOptionsPage>,
): Promise<AgentHitlOptionsPage> {
	let state: z.infer<typeof recipientCursor> = {};
	if (cursor) {
		try {
			state = recipientCursor.parse(jsonParse<unknown>(cursor));
		} catch {
			throw new UserError('Invalid destination page');
		}
	}
	const kinds = ['channel', 'user'] as const;
	const pages = await Promise.all(
		kinds
			.filter((kind) => cursor === undefined || state[kind] !== undefined)
			.map(async (kind) => ({ kind, page: await load(kind, state[kind]) })),
	);
	const next: z.infer<typeof recipientCursor> = {};
	const options: AgentHitlOption[] = [];
	for (const { kind, page } of pages) {
		options.push(...page.options.map((option) => ({ ...option, kind })));
		if (page.nextCursor) next[kind] = page.nextCursor;
	}
	return { options, nextCursor: Object.keys(next).length ? JSON.stringify(next) : undefined };
}
