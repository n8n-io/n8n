import type { I18nClass } from '@n8n/i18n';

export type AiGatewayBalancePillValue = {
	text: string;
	type: 'default' | 'danger' | 'info';
};

/** Formats a Gateway credits balance as "$12.30 remaining". */
export function formatAiGatewayBalanceRemaining(balance: number, i18n: I18nClass): string {
	return i18n.baseText('aiGateway.wallet.balanceRemaining', {
		interpolate: { balance: `$${Number(balance).toFixed(2)}` },
	});
}

/**
 * Builds the Gateway credits balance pill. A balance of zero or less shows
 * "No credits" as a danger pill. Returns undefined until the wallet loads.
 */
export function getAiGatewayBalancePill(
	balance: number | undefined,
	i18n: I18nClass,
): AiGatewayBalancePillValue | undefined {
	if (balance === undefined) return undefined;
	const depleted = balance <= 0;
	return {
		text: depleted
			? i18n.baseText('aiGateway.wallet.noCredits')
			: formatAiGatewayBalanceRemaining(balance, i18n),
		type: depleted ? 'danger' : 'default',
	};
}
