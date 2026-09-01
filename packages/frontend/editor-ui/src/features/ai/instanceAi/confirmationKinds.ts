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
 * With the setup panel enabled, setup/credential cards and structured
 * questions no longer pause the composer: setup completes asynchronously in
 * the panel and questions can be answered as plain chat. Kinds that still
 * require an explicit decision before the run can continue (approvals,
 * channel setup, plan/text input, resource decisions) keep gating.
 */
export function isComposerGatingConfirmation(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;

	if (conf.channelConfig) return true;
	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;

	return conf.inputType !== 'questions';
}
