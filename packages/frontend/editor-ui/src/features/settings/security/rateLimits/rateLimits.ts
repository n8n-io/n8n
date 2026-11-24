import type { PublicApiRateLimitSettings } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

export const PUBLIC_API_RATE_LIMIT_SETTINGS_FLAG = '131_public_api_rate_limit_settings';

export const RATE_LIMIT_ROW_KEYS = [
	'globalRead',
	'globalWrite',
	'endpointRead',
	'endpointWrite',
] as const;

export type RateLimitRowKey = (typeof RATE_LIMIT_ROW_KEYS)[number];

export const RATE_LIMIT_GROUP_KEYS = ['allEndpoints', 'individualEndpoints'] as const;

export type RateLimitGroup = (typeof RATE_LIMIT_GROUP_KEYS)[number];

type LimitField = `${RateLimitRowKey}Limit`;
type WindowField = `${RateLimitRowKey}WindowSeconds`;

/** Text from the dialog inputs, so that an invalid value stays visible until it is fixed. */
export type RateLimitInputs = Record<RateLimitRowKey, { limit: string; window: string }>;

export type RateLimitRowError = 'limit' | 'window';

export const RATE_LIMIT_GROUPS: Record<
	RateLimitGroup,
	{ read: RateLimitRowKey; write: RateLimitRowKey }
> = {
	allEndpoints: { read: 'globalRead', write: 'globalWrite' },
	individualEndpoints: { read: 'endpointRead', write: 'endpointWrite' },
};

const WHOLE_NUMBER = /^\d+$/;

const limitField = (key: RateLimitRowKey): LimitField => `${key}Limit`;
const windowField = (key: RateLimitRowKey): WindowField => `${key}WindowSeconds`;

const parseLimit = (limit: string) => (limit.trim() === '' ? 0 : Number(limit.trim()));

const parseWindow = (window: string) => {
	const value = window.trim();
	return WHOLE_NUMBER.test(value) && Number(value) >= 1 ? Number(value) : undefined;
};

export function toInputs(settings: Omit<PublicApiRateLimitSettings, 'enabled'>): RateLimitInputs {
	const row = (key: RateLimitRowKey) => {
		const limit = settings[limitField(key)];
		return { limit: limit === 0 ? '' : String(limit), window: String(settings[windowField(key)]) };
	};
	return {
		globalRead: row('globalRead'),
		globalWrite: row('globalWrite'),
		endpointRead: row('endpointRead'),
		endpointWrite: row('endpointWrite'),
	};
}

export function parseInputs(
	inputs: RateLimitInputs,
	stored: PublicApiRateLimitSettings,
): PublicApiRateLimitSettings {
	const settings = { ...stored };
	for (const key of RATE_LIMIT_ROW_KEYS) {
		settings[limitField(key)] = parseLimit(inputs[key].limit);
		settings[windowField(key)] = parseWindow(inputs[key].window) ?? stored[windowField(key)];
	}
	return settings;
}

export function getRowError(row: RateLimitInputs[RateLimitRowKey]): RateLimitRowError | undefined {
	const limit = row.limit.trim();
	if (limit !== '' && !WHOLE_NUMBER.test(limit)) return 'limit';
	if (parseLimit(limit) === 0) return undefined;
	if (parseWindow(row.window) === undefined) return 'window';
	return undefined;
}

export function hasNoLimits(inputs: RateLimitInputs): boolean {
	return RATE_LIMIT_ROW_KEYS.every((key) => parseLimit(inputs[key].limit) === 0);
}

/**
 * A per-endpoint limit never applies when it is higher than the all-endpoints limit and its window
 * is not longer. A longer window lets the endpoint count grow across several all-endpoints windows.
 */
export function exceedsAllEndpointsLimit(
	inputs: RateLimitInputs,
	key: 'endpointRead' | 'endpointWrite',
): boolean {
	const endpoint = inputs[key];
	const global = inputs[key === 'endpointRead' ? 'globalRead' : 'globalWrite'];
	if (getRowError(endpoint) !== undefined || getRowError(global) !== undefined) return false;

	const endpointLimit = parseLimit(endpoint.limit);
	const globalLimit = parseLimit(global.limit);
	if (endpointLimit === 0 || globalLimit === 0) return false;

	return endpointLimit > globalLimit && Number(endpoint.window) <= Number(global.window);
}

export function summarizeLimits(
	settings: PublicApiRateLimitSettings,
	group: RateLimitGroup,
	i18n: ReturnType<typeof useI18n>,
): string {
	const { read, write } = RATE_LIMIT_GROUPS[group];
	const plural = (key: 'reads' | 'writes' | 'window', count: number) =>
		i18n.baseText(`settings.security.rateLimits.summary.${key}`, {
			adjustToNumber: count,
			interpolate: { count: count.toLocaleString() },
		});

	const readLimit = settings[limitField(read)];
	const writeLimit = settings[limitField(write)];
	const readWindow = settings[windowField(read)];
	const writeWindow = settings[windowField(write)];
	const reads = plural('reads', readLimit);
	const writes = plural('writes', writeLimit);

	if (readLimit === 0 && writeLimit === 0) {
		return i18n.baseText('settings.security.rateLimits.summary.noLimit');
	}
	if (writeLimit === 0) {
		return i18n.baseText('settings.security.rateLimits.summary.readsOnly', {
			interpolate: { reads, window: plural('window', readWindow) },
		});
	}
	if (readLimit === 0) {
		return i18n.baseText('settings.security.rateLimits.summary.writesOnly', {
			interpolate: { writes, window: plural('window', writeWindow) },
		});
	}
	if (readWindow === writeWindow) {
		return i18n.baseText('settings.security.rateLimits.summary.sameWindow', {
			interpolate: { reads, writes, window: plural('window', readWindow) },
		});
	}
	return i18n.baseText('settings.security.rateLimits.summary.differentWindows', {
		interpolate: {
			reads,
			readWindow: plural('window', readWindow),
			writes,
			writeWindow: plural('window', writeWindow),
		},
	});
}
