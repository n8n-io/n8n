import { ref } from 'vue';

export const OVERRIDES_STORAGE_KEY = 'N8N_EXPERIMENT_OVERRIDES';

export type FlagValue = boolean | string;

export type Flag = {
	name: string;
	phValue: FlagValue | undefined;
	override: FlagValue | undefined;
	isVariant: boolean;
};

type PostHogBlob = {
	$enabled_feature_flags?: Record<string, FlagValue>;
	$active_feature_flags?: string[];
	$override_feature_flags?: Record<string, FlagValue>;
} & Record<string, unknown>;

type PostHogSDK = {
	getFeatureFlags?: () => Record<string, FlagValue> | null | undefined;
};

function readEvaluatedFlags(): Record<string, FlagValue> {
	const out: Record<string, FlagValue> = {};
	try {
		const all = window.featureFlags?.getAll?.();
		if (all) {
			for (const key of Object.keys(all)) {
				const value = all[key];
				if (value !== undefined) out[key] = value;
			}
		}
	} catch {
		// store not initialised yet
	}
	return out;
}

function readSdkFlags(): Record<string, FlagValue> {
	const out: Record<string, FlagValue> = {};
	try {
		const ph = (window as unknown as { posthog?: PostHogSDK }).posthog;
		const flags = ph?.getFeatureFlags?.();
		if (flags) {
			for (const key of Object.keys(flags)) {
				out[key] = flags[key];
			}
		}
	} catch {
		// PostHog not loaded
	}
	return out;
}

function readPersistedFlags(): Record<string, FlagValue> {
	const out: Record<string, FlagValue> = {};
	try {
		for (const key of Object.keys(window.localStorage)) {
			if (!key.startsWith('ph_') || !key.includes('_posthog')) continue;
			const raw = window.localStorage.getItem(key);
			if (!raw) continue;
			const blob = JSON.parse(raw) as PostHogBlob | null;
			if (!blob) continue;

			const enabled = blob.$enabled_feature_flags ?? {};
			for (const k of Object.keys(enabled)) out[k] = enabled[k];

			const active = blob.$active_feature_flags ?? [];
			for (const k of active) {
				if (!(k in out)) out[k] = true;
			}

			const overrides = blob.$override_feature_flags ?? {};
			for (const k of Object.keys(overrides)) out[k] = overrides[k];

			for (const k of Object.keys(blob)) {
				if (k.startsWith('$feature/')) {
					out[k.slice('$feature/'.length)] = blob[k] as FlagValue;
				}
			}
		}
	} catch {
		// malformed blob — skip
	}
	return out;
}

function readOverrides(): Record<string, FlagValue> {
	try {
		const raw = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (parsed && typeof parsed === 'object') return parsed as Record<string, FlagValue>;
		return {};
	} catch {
		return {};
	}
}

function writeOverrides(overrides: Record<string, FlagValue>) {
	window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
}

function isVariantFlag(phValue: FlagValue | undefined, override: FlagValue | undefined): boolean {
	if (typeof phValue === 'string' && phValue !== 'false') return true;
	if (typeof override === 'string' && override !== 'false') return true;
	return false;
}

export function useFeatureFlags() {
	const flags = ref<Flag[]>([]);
	const overrides = ref<Record<string, FlagValue>>({});

	function refresh() {
		const persisted = readPersistedFlags();
		const sdk = readSdkFlags();
		const evaluated = readEvaluatedFlags();
		const ph: Record<string, FlagValue> = { ...persisted, ...sdk, ...evaluated };
		const ovr = readOverrides();
		const allNames = Array.from(new Set([...Object.keys(ph), ...Object.keys(ovr)])).sort();

		overrides.value = ovr;
		flags.value = allNames.map((name) => ({
			name,
			phValue: ph[name],
			override: ovr[name],
			isVariant: isVariantFlag(ph[name], ovr[name]),
		}));
	}

	function setOverride(name: string, value: FlagValue) {
		const next = { ...overrides.value, [name]: value };
		writeOverrides(next);
		refresh();
	}

	function removeOverride(name: string) {
		const next = { ...overrides.value };
		delete next[name];
		writeOverrides(next);
		refresh();
	}

	function clearAll() {
		writeOverrides({});
		refresh();
	}

	return { flags, overrides, refresh, setOverride, removeOverride, clearAll };
}
