import type { CredentialCheckStatus } from 'n8n-workflow';

import type { ChatShellCredentialRow, ChatShellViewModel } from './types';

/** Visitor-facing copy talks about accounts, never credentials — and never `account(s)`. */
const accountsLabel = (count: number) => (count === 1 ? 'account' : 'accounts');

/**
 * View model for `chat-shell.handlebars`, which renders the bar and the "Connect
 * your accounts" dialog. Mirrors Form's shipped `buildFormShellViewModel`: the
 * node supplies data, the template owns all markup and script.
 */
export function buildChatShellViewModel(
	credentials: CredentialCheckStatus[],
	visitorEmail?: string,
): ChatShellViewModel {
	const initialOf = (name: string) => (name.trim().charAt(0) || '?').toUpperCase();
	const rows: ChatShellCredentialRow[] = credentials.map((c) => ({
		id: c.credentialId,
		name: c.credentialName,
		connected: c.status === 'configured',
		initial: initialOf(c.credentialName),
		iconUrl: c.iconUrl,
		authorizationUrl: c.authorizationUrl,
		revokeUrl: c.revokeUrl,
		resolverId: c.resolverId,
		account: c.status === 'configured' ? visitorEmail : undefined,
	}));

	const total = rows.length;
	const connectedCount = rows.filter((r) => r.connected).length;

	return {
		credentials: rows,
		total,
		connectedCount,
		// Design: one account connects directly from the bar; two or more collapse.
		useDialog: total >= 2,
		footerText: `${connectedCount} of ${total} ${accountsLabel(total)} connected`,
	};
}

/**
 * The bar's initial line. The template's own script recomputes it whenever an
 * account connects or disconnects, and adds a failure state that only arises
 * after a click - so this covers the three states the server can know about.
 */
export function connectBarText(vm: ChatShellViewModel, testMode?: boolean): string {
	if (testMode) {
		return "You're testing with your own connected accounts. Visitors will need to connect their own.";
	}
	const remaining = Math.max(vm.total - vm.connectedCount, 0);
	if (remaining === 0) {
		return `All ${vm.total} ${accountsLabel(vm.total)} connected \u00b7 ready to chat`;
	}
	// Nothing connected yet names the full count; part-way through, only what is left.
	if (vm.connectedCount === 0) {
		return `${vm.total} ${accountsLabel(vm.total)} needed to start this chat`;
	}
	return `${remaining} more ${accountsLabel(remaining)} needed to start this chat`;
}
