import type { AssistantUsageDay } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

type TokenCounts = Pick<AssistantUsageDay, 'inputTokens' | 'outputTokens'>;

const numberFormat = new Intl.NumberFormat();
const compactNumberFormat = new Intl.NumberFormat(undefined, {
	notation: 'compact',
	maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
	return numberFormat.format(value);
}

/** Token counts get large, so the chart axis and the table show them short, such as `1.2M`. */
export function formatCompactNumber(value: number): string {
	return compactNumberFormat.format(value);
}

export function totalTokens(usage: TokenCounts): number {
	return usage.inputTokens + usage.outputTokens;
}

/** The input and output tokens, one line each, with exact counts. */
export function tokenBreakdown(usage: TokenCounts): string[] {
	return [
		i18n.baseText('settings.n8nAgent.usage.tokens.input', {
			interpolate: { count: formatNumber(usage.inputTokens) },
		}),
		i18n.baseText('settings.n8nAgent.usage.tokens.output', {
			interpolate: { count: formatNumber(usage.outputTokens) },
		}),
	];
}
