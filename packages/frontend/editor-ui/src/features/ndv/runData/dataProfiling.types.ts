export type ProfileFieldValueType = 'string' | 'number' | 'boolean';

export interface FrequencyEntry {
	label: string;
	count: number;
	/** Set on the synthetic "N other values" bucket appended by the top-N cutoff — absent for real values. */
	kind?: 'other';
}

export interface FrequencyStats {
	kind: 'frequency';
	entries: FrequencyEntry[];
}

export interface HistogramBin {
	label: string;
	rangeStart: number;
	rangeEnd: number;
	count: number;
}

export interface HistogramStats {
	kind: 'histogram';
	bins: HistogramBin[];
	min: number;
	max: number;
}

export interface UnprofiledStats {
	kind: 'unprofiled';
	reason: 'high-cardinality';
	distinctCount: number;
}

export type FieldStats = FrequencyStats | HistogramStats | UnprofiledStats;

export interface FieldProfile {
	path: string;
	type: ProfileFieldValueType;
	presentCount: number;
	missingCount: number;
	mixedTypeCount: number;
	stats: FieldStats;
}

export interface LocationPoint {
	lat: number;
	lon: number;
}

export interface LocationProfile {
	latPath: string;
	lonPath: string;
	points: LocationPoint[];
}

export interface DataProfile {
	fields: FieldProfile[];
	location: LocationProfile | null;
	itemsProfiled: number;
	itemsTotal: number;
	capped: boolean;
}

export type ProfilableItem = Record<string, unknown>;
