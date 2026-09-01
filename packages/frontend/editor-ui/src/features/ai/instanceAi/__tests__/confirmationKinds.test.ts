import type { InstanceAiConfirmation } from '@n8n/api-types';
import { describe, it, expect } from 'vitest';

import { isPendingItemBlockingInput, isPendingItemFloating } from '../confirmationKinds';
import type { PendingConfirmationItem } from '../instanceAi.store';

function pendingItem(confirmation: Partial<InstanceAiConfirmation>): PendingConfirmationItem {
	return {
		toolCall: {
			confirmation: {
				requestId: 'req-1',
				toolCallId: 'tc-1',
				toolName: 'workflows',
				args: {},
				severity: 'info',
				message: 'Configure the nodes',
				...confirmation,
			},
		},
		agentNode: {},
		messageId: 'msg-1',
	} as unknown as PendingConfirmationItem;
}

type SetupRequest = NonNullable<InstanceAiConfirmation['setupRequests']>[number];
type CredentialRequest = NonNullable<InstanceAiConfirmation['credentialRequests']>[number];

// Only the fields the predicate reads matter — it is presence-based, not shape-based.
const setupNode = {
	node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
} as unknown as SetupRequest;
const credentialRequest = { credentialType: 'slackApi' } as unknown as CredentialRequest;

/**
 * INS-1130. The composer must stay live for cards the user can answer by typing. These
 * cases pin *which* cards those are — the answer has to agree with the backend, which
 * refuses a message over any other card, so a wrong answer here yields either a dead
 * input or an input that 409s on send.
 */
describe('isPendingItemBlockingInput', () => {
	const answerable: Array<[string, Partial<InstanceAiConfirmation>]> = [
		['per-node setup wizard', { setupRequests: [setupNode] }],
		['credential picker', { credentialRequests: [credentialRequest] }],
		['credential finalize stage', { credentialFlow: { stage: 'finalize' } }],
		['agent chat-channel setup', { channelConfig: { type: 'slack' } as never }],
	];

	it.each(answerable)('leaves the input open for the %s', (_label, confirmation) => {
		expect(isPendingItemBlockingInput(pendingItem(confirmation))).toBe(false);
	});

	const blocking: Array<[string, Partial<InstanceAiConfirmation>]> = [
		['generic approval', { inputType: 'approval' as const }],
		['approval with no explicit inputType', {}],
		['structured questions wizard', { inputType: 'questions' as const }],
		['gateway resource decision', { inputType: 'resource-decision' as const }],
		['single-button continue', { inputType: 'continue' as const }],
		['free-text prompt', { inputType: 'text' as const }],
		// Plan review keeps its own "Ask for edits" composer flow (INS-886 stays separate),
		// so a bare message must not settle it — the plan tool has no settle branch and
		// would read the stripped payload as a hard plan denial.
		['plan review', { inputType: 'plan-review' as const }],
	];

	it.each(blocking)('keeps blocking the input for the %s', (_label, confirmation) => {
		expect(isPendingItemBlockingInput(pendingItem(confirmation))).toBe(true);
	});

	// The two predicates answer different questions and must not be conflated: a plan
	// review renders inline (not floating) yet still blocks the composer.
	it('is not merely the inverse of the floating/inline split', () => {
		const planReview = pendingItem({ inputType: 'plan-review' });

		expect(isPendingItemFloating(planReview)).toBe(false);
		expect(isPendingItemBlockingInput(planReview)).toBe(true);
	});

	// A setup card that is presence-only still reaches the setup branch regardless of the
	// inputType the tool happened to stamp on it.
	it('honours setup presence over an approval inputType', () => {
		const item = pendingItem({ inputType: 'approval', setupRequests: [setupNode] });

		expect(isPendingItemBlockingInput(item)).toBe(false);
	});

	it('blocks on an empty setup list rather than treating it as answerable', () => {
		expect(isPendingItemBlockingInput(pendingItem({ setupRequests: [] }))).toBe(true);
	});
});
