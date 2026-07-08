import { i18n } from '@n8n/i18n';

/**
 * Formats the AI gateway wallet balance for badges, e.g. "$5.00 remaining"
 * or "No credits" when depleted. Returns undefined while the balance is
 * unknown (not fetched yet) so callers can hide the badge.
 */
export function formatWalletBalance(balance: number | undefined): string | undefined {
	if (balance === undefined) return undefined;
	return balance <= 0
		? i18n.baseText('aiGateway.wallet.noCredits')
		: i18n.baseText('aiGateway.wallet.balanceRemaining', {
				interpolate: { balance: `$${Number(balance).toFixed(2)}` },
			});
}
