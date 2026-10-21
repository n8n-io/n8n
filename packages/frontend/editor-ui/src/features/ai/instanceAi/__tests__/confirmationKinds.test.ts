import {
	INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE,
	type InstanceAiAgentNode,
	type InstanceAiConfirmation,
} from '@n8n/api-types';

import { isCloudBrowserResourceDecision, isPendingItemFloating } from '../confirmationKinds';
import type { PendingConfirmationItem } from '../instanceAi.store';

function makeItem(role: string, confirmation: Partial<InstanceAiConfirmation>) {
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
		agentNode: { agentId: 'agent-1', role } as InstanceAiAgentNode,
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

describe('isCloudBrowserResourceDecision', () => {
	it('matches a resource decision from the cloud browser agent', () => {
		const item = makeItem(INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE, resourceDecision);

		expect(isCloudBrowserResourceDecision(item)).toBe(true);
	});

	it('does not match a resource decision from another agent', () => {
		const item = makeItem('orchestrator', resourceDecision);

		expect(isCloudBrowserResourceDecision(item)).toBe(false);
	});

	it('does not match another confirmation from the cloud browser agent', () => {
		const item = makeItem(INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE, { inputType: 'text' });

		expect(isCloudBrowserResourceDecision(item)).toBe(false);
	});
});

describe('isPendingItemFloating', () => {
	it('floats a resource decision from the cloud browser agent', () => {
		const item = makeItem(INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE, resourceDecision);

		expect(isPendingItemFloating(item)).toBe(true);
	});

	it('keeps a resource decision from another agent inline', () => {
		const item = makeItem('orchestrator', resourceDecision);

		expect(isPendingItemFloating(item)).toBe(false);
	});
});
