import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import { reportAffectedNodes } from '../../detection-report';
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
// First @n8n/chat release that parses JSON WebSocket frames.
const MIN_CHAT_WIDGET_VERSION = '1.31.0';

@BreakingChangeRule({ version: 'v3' })
export class ChatTriggerEmbeddedJsonRule implements IBreakingChangeWorkflowRule {
	id = 'chat-trigger-embedded-json-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Embedded chat now uses a JSON WebSocket message format',
			description: `The chat WebSocket now sends every frame as JSON. An embedded chat that pins an @n8n/chat widget older than ${MIN_CHAT_WIDGET_VERSION} cannot read the new frames. A custom chat client that reads the raw WebSocket cannot read them until you update it. Embeds that use the unpinned CDN script update automatically. Hosted chats that n8n serves are not affected.`,
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			documentationUrl: 'https://docs.n8n.io/changelog/v30-breaking-changes',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: `Update your embedded chat to @n8n/chat ${MIN_CHAT_WIDGET_VERSION} or later`,
				description: `If you pin the @n8n/chat widget, update it to version ${MIN_CHAT_WIDGET_VERSION} or later. If you use a custom chat client, make it parse JSON frames. Embeds that use the unpinned CDN script update automatically and need no action.`,
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

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses an embedded chat`,
			description: `This embedded chat now receives JSON WebSocket frames. Update a pinned @n8n/chat widget to version ${MIN_CHAT_WIDGET_VERSION} or later, or make your custom chat client parse JSON frames. Unpinned CDN embeds update automatically.`,
			level: 'warning',
		}));
	}
}
