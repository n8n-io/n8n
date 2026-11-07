import type { InstanceAiAgentNode, InstanceAiConfirmation } from '@n8n/api-types';

import { isCloudBrowserAgent, isCloudBrowserResourceDecision } from '../cloudBrowserAgents';
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

describe('isCloudBrowserAgent', () => {
	it('matches the cloud browser kind only', () => {
		expect(isCloudBrowserAgent({ kind: 'cloud-browser' })).toBe(true);
		expect(isCloudBrowserAgent({ kind: 'builder' })).toBe(false);
		expect(isCloudBrowserAgent({ kind: undefined })).toBe(false);
	});
});

describe('isCloudBrowserResourceDecision', () => {
	it('matches a resource decision from the cloud browser agent', () => {
		const item = makeItem('cloud-browser', resourceDecision);

		expect(isCloudBrowserResourceDecision(item)).toBe(true);
	});

	it('does not match a resource decision from another agent', () => {
		const item = makeItem(undefined, resourceDecision);

		expect(isCloudBrowserResourceDecision(item)).toBe(false);
	});

	it('does not match another confirmation from the cloud browser agent', () => {
		const item = makeItem('cloud-browser', { inputType: 'text' });

		expect(isCloudBrowserResourceDecision(item)).toBe(false);
	});
});
