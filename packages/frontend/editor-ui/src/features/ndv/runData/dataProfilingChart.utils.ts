import { useI18n } from '@n8n/i18n';
import type { FrequencyEntry, HistogramBin } from './dataProfiling.types';

export interface ChartSlice {
	label: string;
	count: number;
	kind: 'value' | 'other' | 'missing';
}

export function buildFrequencySlices(
	entries: FrequencyEntry[],
	missingCount: number,
): ChartSlice[] {
	const slices: ChartSlice[] = entries.map((entry) => ({
		label: entry.label,
		count: entry.count,
		kind: entry.kind === 'other' ? 'other' : 'value',
	}));
	if (missingCount > 0) {
		const i18n = useI18n();
		slices.push({
			label: i18n.baseText('runData.profile.missingLabel'),
			count: missingCount,
			kind: 'missing',
		});
	}
	return slices;
}

export function buildHistogramSlices(bins: HistogramBin[], missingCount: number): ChartSlice[] {
	const slices: ChartSlice[] = bins.map((bin) => ({
		label: bin.label,
		count: bin.count,
		kind: 'value',
	}));
	if (missingCount > 0) {
		const i18n = useI18n();
		slices.push({
			label: i18n.baseText('runData.profile.missingLabel'),
			count: missingCount,
			kind: 'missing',
		});
	}
	return slices;
}
