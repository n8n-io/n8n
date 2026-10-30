import { isCloudBrowserResourceDecision } from './cloudBrowserAgents';
import type { PendingConfirmationItem } from './instanceAi.store';

/**
 * Decides whether a pending confirmation belongs in the floating slot (takes
 * over the chat input) or the inline list (renders in the chat flow).
 *
 * Floating: structured questions, single-click approvals, domain/web-search access,
 *   and cloud browser resource-decisions.
 * Inline: text, setup, credential, other gateway resource-decisions,
 *   continue, channel setup.
 *
 * Items are inline-by-presence: if `setupRequests` / `credentialRequests` /
 * `credentialFlow` / `channelConfig` / `testListener` is set, the panel renders
 * a setup, credential, channel, or test-listener card regardless of `inputType`. Otherwise `inputType` drives the
 * choice; an absent or `'approval'` `inputType` falls through to floating.
 */
export function isPendingItemFloating(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;

	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;
	if (conf.channelConfig) return false;
	if (conf.testListener) return false;

	switch (conf.inputType) {
		case 'text':
		case 'continue':
			return false;
		case 'resource-decision':
			return isCloudBrowserResourceDecision(item);
		case 'questions':
		case 'approval':
		case undefined:
			return true;
	}
}
