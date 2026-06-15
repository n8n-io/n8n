import type { PendingConfirmationItem } from './instanceAi.store';

/**
 * Decides whether a pending confirmation belongs in the floating slot (takes
 * over the chat input) or the inline list (renders in the chat flow).
 *
 * Floating: single-click approvals + domain/web-search access.
 * Inline: questions, plan-review, text, setup, credential, gateway
 *   resource-decision, continue.
 *
 * Items are inline-by-presence: if `setupRequests` / `credentialRequests` /
 * `credentialFlow` is set, the panel renders a setup or credential card
 * regardless of `inputType`. Otherwise `inputType` drives the choice; an
 * absent or `'approval'` `inputType` falls through to floating.
 */
export function isPendingItemFloating(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;

	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;

	switch (conf.inputType) {
		case 'questions':
		case 'plan-review':
		case 'text':
		case 'resource-decision':
		case 'continue':
			return false;
		case 'approval':
		case undefined:
			return true;
	}
}
