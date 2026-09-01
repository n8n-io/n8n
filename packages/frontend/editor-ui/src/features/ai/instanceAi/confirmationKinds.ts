import { isMessageSettleableConfirmation } from '@n8n/api-types';

import type { PendingConfirmationItem } from './instanceAi.store';

/**
 * Decides whether a pending confirmation belongs in the floating slot (takes
 * over the chat input) or the inline list (renders in the chat flow).
 *
 * Floating: structured questions, single-click approvals, and domain/web-search access.
 * Inline: plan-review, text, setup, credential, gateway resource-decision,
 *   continue, channel setup.
 *
 * Items are inline-by-presence: if `setupRequests` / `credentialRequests` /
 * `credentialFlow` / `channelConfig` is set, the panel renders a setup or
 * credential card regardless of `inputType`. Otherwise `inputType` drives the
 * choice; an absent or `'approval'` `inputType` falls through to floating.
 */
export function isPendingItemFloating(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;

	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;
	if (conf.channelConfig) return false;

	switch (conf.inputType) {
		case 'plan-review':
		case 'text':
		case 'resource-decision':
		case 'continue':
			return false;
		case 'questions':
		case 'approval':
		case undefined:
			return true;
	}
}

/**
 * Whether this pending confirmation blocks the chat input.
 *
 * A setup or credential card does not: sending a message is a valid way to answer it, and
 * the backend settles the card and runs the message as the next turn (INS-1130). Every
 * other card still blocks — for a floating one the panel has taken the input slot anyway,
 * and for a plan review the "Ask for edits" flow owns the composer.
 *
 * Deliberately delegates to the shared `@n8n/api-types` predicate the backend uses to
 * decide whether to accept the message. Forking the two would produce either an input the
 * user can type into that 409s on send, or a card the backend would happily settle but the
 * user cannot reply to.
 */
export function isPendingItemBlockingInput(item: PendingConfirmationItem): boolean {
	return !isMessageSettleableConfirmation(item.toolCall.confirmation);
}
