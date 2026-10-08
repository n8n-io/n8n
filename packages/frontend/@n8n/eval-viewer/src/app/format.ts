/** Display formatting. Every formatter shows a dash for a missing value. */
import type { BadgeVariant, TextColor } from '@n8n/design-system';

import type { Direction } from '../metrics';

const DASH = '–';

export function formatNumber(value: number | null | undefined, digits = 0): string {
	if (value === null || value === undefined || Number.isNaN(value)) return DASH;
	return value.toLocaleString('en-US', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});
}

export function formatTokens(value: number | null | undefined): string {
	if (value === null || value === undefined) return DASH;
	if (Math.abs(value) >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)}M`;
	if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, 0)}k`;
	return formatNumber(value);
}

export const formatCost = (value: number | null | undefined) =>
	value === null || value === undefined ? DASH : `$${formatNumber(value, 2)}`;

export const formatSeconds = (value: number | null | undefined) =>
	value === null || value === undefined ? DASH : `${formatNumber(value, value < 10 ? 1 : 0)} s`;

export const formatMs = (value: number | null | undefined) =>
	value === null || value === undefined ? DASH : formatSeconds(value / 1000);

export const formatPercent = (value: number | null | undefined) =>
	value === null || value === undefined ? DASH : `${formatNumber(value * 100, 0)}%`;

export const formatRate = (part: number, whole: number) =>
	whole > 0 ? `${part}/${whole} (${formatPercent(part / whole)})` : DASH;

export function formatSigned(value: number | null, format: (value: number) => string): string {
	if (value === null) return DASH;
	return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${format(Math.abs(value))}`;
}

export const countVariant = (pass: number, total: number): BadgeVariant =>
	total === 0 ? 'subtle' : pass === total ? 'success' : 'danger';

/** Text and icon colour for a change against the baseline. */
export const directionColor = (value: Direction): TextColor | undefined =>
	value === 'better' ? 'success' : value === 'worse' ? 'danger' : undefined;
