import { normalizeMetricScore } from '@n8n/api-types';

/**
 * Per-metric scores normalized to [0, 1] by their scale (AI-judge metrics are
 * 1–5 → /5); operational metrics (token counts, execution time) and
 * unknown-scale values are dropped. Booleans coerce to 0/1. Shared by the run
 * (aggregate) and per-case scoring so the two can't disagree on which metrics
 * count or how they're scaled.
 */
export function normalizedScores(
	metrics: Record<string, number | boolean> | null | undefined,
): Record<string, number> {
	const out: Record<string, number> = {};
	if (!metrics) return out;
	for (const [key, raw] of Object.entries(metrics)) {
		const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw;
		if (typeof value !== 'number') continue;
		const score = normalizeMetricScore(key, value);
		if (score !== null) out[key] = score;
	}
	return out;
}

/** Mean of the normalized score metrics, or null when none qualify. */
export function averageNormalizedScore(
	metrics: Record<string, number | boolean> | null | undefined,
): number | null {
	const values = Object.values(normalizedScores(metrics));
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}
