import type { IDataObject } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import type {
	DataProfile,
	FieldProfile,
	FieldStats,
	FrequencyEntry,
	FrequencyStats,
	HistogramBin,
	HistogramStats,
	LocationPoint,
	LocationProfile,
	UnprofiledStats,
} from '../dataProfiling.types';

export const PROFILE_MIN_ITEMS_THRESHOLD = 10;
export const PROFILE_ITEM_CAP = 1000;
export const PROFILE_LOW_CARDINALITY_CUTOFF = 10;
export const PROFILE_TOP_N = 10;
export const PROFILE_HIGH_CARDINALITY_RATIO = 0.5;
export const PROFILE_HISTOGRAM_BIN_COUNT = 10;
export const PROFILE_VISIBILITY_SAMPLE_SIZE = 50;

const LAT_LON_KEY_PAIRS: Array<[string, string]> = [
	['lat', 'lon'],
	['latitude', 'longitude'],
];
const LAT_RANGE: [number, number] = [-90, 90];
const LON_RANGE: [number, number] = [-180, 180];

type ScalarType = 'string' | 'number' | 'boolean';
type ScalarValue = string | number | boolean;

function scalarTypeOf(value: unknown): ScalarType | null {
	const type = typeof value;
	return type === 'string' || type === 'number' || type === 'boolean' ? type : null;
}

function collectTopLevelKeys(items: IDataObject[]): string[] {
	const seen = new Set<string>();
	for (const item of items) {
		for (const key of Object.keys(item)) {
			seen.add(key);
		}
	}
	return [...seen];
}

function toFrequencyEntries(counts: Map<string, number>) {
	return [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countBy(values: ScalarValue[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const value of values) {
		const label = String(value);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return counts;
}

function buildFrequencyStats(counts: Map<string, number>): FrequencyStats {
	return { kind: 'frequency', entries: toFrequencyEntries(counts) };
}

function buildTopNWithOthersStats(counts: Map<string, number>, topN: number): FrequencyStats {
	const entries = toFrequencyEntries(counts);
	const top = entries.slice(0, topN);
	const rest = entries.slice(topN);
	if (rest.length === 0) {
		return { kind: 'frequency', entries: top };
	}

	const i18n = useI18n();
	const otherEntry: FrequencyEntry = {
		label: i18n.baseText('runData.profile.otherValuesLabel', {
			interpolate: { count: rest.length },
		}),
		count: rest.reduce((sum, entry) => sum + entry.count, 0),
		kind: 'other',
	};
	return { kind: 'frequency', entries: [...top, otherEntry] };
}

function formatBinLabel(start: number, end: number): string {
	const round = (value: number) => Number(value.toFixed(2));
	return `${round(start)}–${round(end)}`;
}

function buildHistogramStats(values: number[], binCount: number): HistogramStats {
	const min = Math.min(...values);
	const max = Math.max(...values);

	if (min === max) {
		const bin: HistogramBin = {
			label: formatBinLabel(min, max),
			rangeStart: min,
			rangeEnd: max,
			count: values.length,
		};
		return { kind: 'histogram', min, max, bins: [bin] };
	}

	const binSize = (max - min) / binCount;
	const bins: HistogramBin[] = Array.from({ length: binCount }, (_, index) => {
		const rangeStart = min + index * binSize;
		const rangeEnd = index === binCount - 1 ? max : min + (index + 1) * binSize;
		return { label: formatBinLabel(rangeStart, rangeEnd), rangeStart, rangeEnd, count: 0 };
	});

	for (const value of values) {
		const index = value === max ? binCount - 1 : Math.floor((value - min) / binSize);
		bins[index].count += 1;
	}

	return { kind: 'histogram', min, max, bins };
}

function buildStatsForType(
	type: ScalarType,
	values: ScalarValue[],
	missingCount: number,
): FieldStats {
	if (type === 'boolean') {
		const counts = countBy(values.map((value) => (value ? 'true' : 'false')));
		return {
			kind: 'frequency',
			entries: [
				{ label: 'true', count: counts.get('true') ?? 0 },
				{ label: 'false', count: counts.get('false') ?? 0 },
			],
		};
	}

	const distinctCount = new Set(values).size;

	if (type === 'number') {
		if (distinctCount <= PROFILE_LOW_CARDINALITY_CUTOFF) {
			return buildFrequencyStats(countBy(values));
		}
		return buildHistogramStats(values as number[], PROFILE_HISTOGRAM_BIN_COUNT);
	}

	// string
	if (distinctCount <= PROFILE_LOW_CARDINALITY_CUTOFF) {
		return buildFrequencyStats(countBy(values));
	}

	// Above the low-cardinality cutoff, only bother visualizing if distinct values
	// (missing counted as one more "value") stay under half the dataset — otherwise
	// most items are effectively unique and a top-N breakdown is just noise.
	const datasetSize = values.length + missingCount;
	const effectiveDistinct = distinctCount + (missingCount > 0 ? 1 : 0);
	if (effectiveDistinct < datasetSize * PROFILE_HIGH_CARDINALITY_RATIO) {
		return buildTopNWithOthersStats(countBy(values), PROFILE_TOP_N);
	}

	return { kind: 'unprofiled', reason: 'high-cardinality', distinctCount };
}

function profileField(items: IDataObject[], key: string): FieldProfile | null {
	let dominantType: ScalarType | null = null;
	const values: ScalarValue[] = [];
	let missingCount = 0;
	let mixedTypeCount = 0;

	for (const item of items) {
		const type = scalarTypeOf(item[key]);
		if (type === null) {
			missingCount += 1;
			continue;
		}
		dominantType ??= type;
		if (type === dominantType) {
			values.push(item[key] as ScalarValue);
		} else {
			mixedTypeCount += 1;
		}
	}

	if (dominantType === null) {
		return null;
	}

	return {
		path: key,
		type: dominantType,
		presentCount: values.length,
		missingCount,
		mixedTypeCount,
		stats: buildStatsForType(dominantType, values, missingCount),
	};
}

function findLatLonKeys(fields: FieldProfile[]): { latPath: string; lonPath: string } | null {
	const numericFieldByLowerName = new Map<string, string>();
	for (const field of fields) {
		if (field.type === 'number') {
			numericFieldByLowerName.set(field.path.toLowerCase(), field.path);
		}
	}
	for (const [latKey, lonKey] of LAT_LON_KEY_PAIRS) {
		const latPath = numericFieldByLowerName.get(latKey);
		const lonPath = numericFieldByLowerName.get(lonKey);
		if (latPath && lonPath) {
			return { latPath, lonPath };
		}
	}
	return null;
}

function isInRange(value: number, [min, max]: [number, number]): boolean {
	return Number.isFinite(value) && value >= min && value <= max;
}

function buildLocationProfile(
	sample: IDataObject[],
	latPath: string,
	lonPath: string,
): LocationProfile | null {
	const points: LocationPoint[] = [];
	for (const item of sample) {
		const lat = item[latPath];
		const lon = item[lonPath];
		if (
			typeof lat === 'number' &&
			typeof lon === 'number' &&
			isInRange(lat, LAT_RANGE) &&
			isInRange(lon, LON_RANGE)
		) {
			points.push({ lat, lon });
		}
	}
	return points.length > 0 ? { latPath, lonPath, points } : null;
}

function profileItems(items: IDataObject[]): DataProfile {
	const itemsTotal = items.length;
	const sample = items.slice(0, PROFILE_ITEM_CAP);
	const capped = itemsTotal > PROFILE_ITEM_CAP;
	const fields = collectTopLevelKeys(sample)
		.map((key) => profileField(sample, key))
		.filter((field): field is FieldProfile => field !== null);

	const latLonKeys = findLatLonKeys(fields);
	const location = latLonKeys
		? buildLocationProfile(sample, latLonKeys.latPath, latLonKeys.lonPath)
		: null;
	const visibleFields = location
		? fields.filter((field) => field.path !== location.latPath && field.path !== location.lonPath)
		: fields;

	return { fields: visibleFields, location, itemsProfiled: sample.length, itemsTotal, capped };
}

function hasProfilableField(
	items: IDataObject[],
	sampleSize = PROFILE_VISIBILITY_SAMPLE_SIZE,
): boolean {
	const sample = items.slice(0, sampleSize);
	return collectTopLevelKeys(sample).some((key) =>
		sample.some((item) => scalarTypeOf(item[key]) !== null),
	);
}

export function isUnprofiledField(
	field: FieldProfile,
): field is FieldProfile & { stats: UnprofiledStats } {
	return field.stats.kind === 'unprofiled';
}

export function useDataProfiling() {
	return { profileItems, hasProfilableField };
}
