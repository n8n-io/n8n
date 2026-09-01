import { describe, it, expect } from 'vitest';
import type { InstanceAiConfirmation } from '@n8n/api-types';
import type { PendingConfirmationItem } from '../instanceAi.store';
import { isComposerGatingConfirmation } from '../confirmationKinds';

function makeItem(confirmation: Partial<InstanceAiConfirmation>): PendingConfirmationItem {
	return {
		toolCall: {
			toolCallId: 'tc-1',
			confirmation: { requestId: 'req-1', severity: 'info', message: '', ...confirmation },
		},
	} as unknown as PendingConfirmationItem;
}

describe('isComposerGatingConfirmation', () => {
	it.each([
		['setup requests', { setupRequests: [{ workflowId: 'wf-1' }] }],
		['credential requests', { credentialRequests: [{ credentialType: 'slackApi' }] }],
		['a credential flow', { credentialFlow: { credentialType: 'slackApi' } }],
		['structured questions', { inputType: 'questions' as const }],
	])('does not gate the composer for %s', (_label, confirmation) => {
		expect(
			isComposerGatingConfirmation(makeItem(confirmation as Partial<InstanceAiConfirmation>)),
		).toBe(false);
	});

	it.each([
		['channel setup', { channelConfig: { channel: 'email' } }],
		['channel setup even alongside setup requests', {
			channelConfig: { channel: 'email' },
			setupRequests: [{ workflowId: 'wf-1' }],
		}],
		['plain approvals', {}],
		['explicit approvals', { inputType: 'approval' as const }],
		['text input', { inputType: 'text' as const }],
		['resource decisions', { inputType: 'resource-decision' as const }],
		['continue prompts', { inputType: 'continue' as const }],
	])('keeps gating the composer for %s', (_label, confirmation) => {
		expect(
			isComposerGatingConfirmation(makeItem(confirmation as Partial<InstanceAiConfirmation>)),
		).toBe(true);
	});
});
