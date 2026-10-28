import { ONBOARDING_EXAMPLE_REQUEST_ID_PREFIX } from '@n8n/api-types';

import type { PendingConfirmationItem } from './instanceAi.store';

/** The question under the onboarding example. The example card shows it, on its last node. */
export function isOnboardingExampleQuestion(item: PendingConfirmationItem): boolean {
	return (
		item.toolCall.confirmation.requestId?.startsWith(ONBOARDING_EXAMPLE_REQUEST_ID_PREFIX) === true
	);
}

/**
 * Decides whether a pending confirmation belongs in the floating slot (takes
 * over the chat input) or the inline list (renders in the chat flow).
 *
 * Floating: structured questions, single-click approvals, and domain/web-search access.
 * Inline: text, setup, credential, gateway resource-decision,
 *   continue, channel setup.
 *
 * Items are inline-by-presence: if `setupRequests` / `credentialRequests` /
 * `credentialFlow` / `channelConfig` / `testListener` is set, the panel renders
 * a setup, credential, channel, or test-listener card regardless of `inputType`. Otherwise `inputType` drives the
 * choice; an absent or `'approval'` `inputType` falls through to floating.
 */
export function isPendingItemFloating(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;

	if (isOnboardingExampleQuestion(item)) return false;
	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;
	if (conf.channelConfig) return false;
	if (conf.testListener) return false;

	switch (conf.inputType) {
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
