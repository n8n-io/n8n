import type { InstanceAiAgentNode, InstanceAiConfirmation } from '@n8n/api-types';

import { isPendingItemFloating } from '../confirmationKinds';
import type { PendingConfirmationItem } from '../instanceAi.store';

function makeItem(
	kind: InstanceAiAgentNode['kind'],
	confirmation: Partial<InstanceAiConfirmation>,
) {
	return {
		toolCall: {
			toolCallId: 'tc-1',
			toolName: 'browser_navigate',
			args: {},
			isLoading: true,
			confirmation: {
				requestId: 'req-1',
				severity: 'warning',
				message: 'browser_navigate: Browser: example.com',
				...confirmation,
			},
		},
		agentNode: { agentId: 'agent-1', role: 'agent', kind } as InstanceAiAgentNode,
		messageId: 'msg-1',
	} as PendingConfirmationItem;
}

const resourceDecision = {
	inputType: 'resource-decision',
	resourceDecision: {
		toolGroup: 'browser',
		kind: 'host',
		resource: 'example.com',
		description: 'Browser: example.com',
		options: ['denyOnce', 'allowOnce', 'allowForSession'],
	},
} satisfies Partial<InstanceAiConfirmation>;

describe('isPendingItemFloating', () => {
	it('floats a resource decision from the cloud browser agent', () => {
		const item = makeItem('cloud-browser', resourceDecision);

		expect(isPendingItemFloating(item)).toBe(true);
	});

	it('keeps a resource decision from another agent inline', () => {
		const item = makeItem(undefined, resourceDecision);

		expect(isPendingItemFloating(item)).toBe(false);
	});
});
