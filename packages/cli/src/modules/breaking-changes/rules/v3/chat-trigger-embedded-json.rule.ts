import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

// Chat Trigger is normalized to the scoped type, but legacy workflows may carry the un-scoped form.
const CHAT_TRIGGER_NODE_TYPES = [
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'n8n-nodes-langchain.chatTrigger',
];
// Embedded mode ('webhook') runs the widget/client on the customer's own site; 'hostedChat' (also
// the default when unset) is served by n8n from the unpinned CDN and updates automatically.
const EMBEDDED_MODE = 'webhook';

@BreakingChangeRule({ version: 'v3' })
export class ChatTriggerEmbeddedJsonRule implements IBreakingChangeWorkflowRule {
	id = 'chat-trigger-embedded-json-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Embedded chat now uses a JSON WebSocket message format',
			description:
				'The chat WebSocket now sends every frame as JSON. Embedded chats using an old @n8n/chat widget pinned to a specific version, or a custom chat client that reads the raw WebSocket, will not understand the new frames until updated. Chats embedded via the unpinned CDN script update automatically, and hosted chats served by n8n are unaffected.',
			category: BreakingChangeCategory.workflow,
			severity: 'low',
			documentationUrl: 'https://www.npmjs.com/package/@n8n/chat',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Update your embedded chat to support the JSON message format',
				description:
					'If you embed the @n8n/chat widget with a pinned version, update it to a version that supports the JSON WebSocket format. If you use a custom chat client, make sure it parses JSON frames. Embeds using the unpinned CDN script update automatically and need no action.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = CHAT_TRIGGER_NODE_TYPES.flatMap(
			(type) => nodesGroupedByType.get(type) ?? [],
		).filter((node) => node.parameters.mode === EMBEDDED_MODE);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses an embedded chat`,
				description:
					'This embedded chat now receives JSON WebSocket frames. Update a pinned @n8n/chat widget to a version that supports the JSON format, or ensure your custom chat client parses JSON frames. Unpinned CDN embeds update automatically.',
				level: 'warning',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
