import type { PublicApiRateLimitSettings } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

export type RateLimitRowKey = 'globalRead' | 'globalWrite' | 'endpointRead' | 'endpointWrite';

export type RateLimitGroup = 'allEndpoints' | 'individualEndpoints';

type LimitField = `${RateLimitRowKey}Limit`;
type WindowField = `${RateLimitRowKey}WindowSeconds`;

/** The dialog keeps raw text, so that an invalid value stays visible until it is fixed. */
export type RateLimitDraft = Record<RateLimitRowKey, { limit: string; window: string }>;

export type RateLimitRowError = 'limit' | 'window';

export const RATE_LIMIT_GROUPS: Record<
	RateLimitGroup,
	{ read: RateLimitRowKey; write: RateLimitRowKey }
> = {
	allEndpoints: { read: 'globalRead', write: 'globalWrite' },
	individualEndpoints: { read: 'endpointRead', write: 'endpointWrite' },
};

const ROW_KEYS: RateLimitRowKey[] = ['globalRead', 'globalWrite', 'endpointRead', 'endpointWrite'];

const WHOLE_NUMBER = /^\d+$/;

const limitField = (key: RateLimitRowKey): LimitField => `${key}Limit`;
const windowField = (key: RateLimitRowKey): WindowField => `${key}WindowSeconds`;

/** An empty limit, or one that is 0, means no limit. */
const parseLimit = (limit: string) => (limit.trim() === '' ? 0 : Number(limit.trim()));

export function toDraft(settings: PublicApiRateLimitSettings): RateLimitDraft {
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

/** Call only with a draft that has no row errors. */
export function fromDraft(
	draft: RateLimitDraft,
	base: PublicApiRateLimitSettings,
): PublicApiRateLimitSettings {
	const settings = { ...base };
	for (const key of ROW_KEYS) {
		settings[limitField(key)] = parseLimit(draft[key].limit);
		settings[windowField(key)] = Number(draft[key].window);
	}
	return settings;
}

export function getRowError(row: RateLimitDraft[RateLimitRowKey]): RateLimitRowError | undefined {
	const limit = row.limit.trim();
	if (limit !== '' && !WHOLE_NUMBER.test(limit)) return 'limit';
	if (parseLimit(limit) === 0) return undefined;
	if (!WHOLE_NUMBER.test(row.window.trim()) || Number(row.window) < 1) return 'window';
	return undefined;
}

export function isDraftEmpty(draft: RateLimitDraft): boolean {
	return ROW_KEYS.every((key) => parseLimit(draft[key].limit) === 0);
}

export function isRowDefault(
	draft: RateLimitDraft,
	defaults: PublicApiRateLimitSettings,
	key: RateLimitRowKey,
): boolean {
	const defaultRow = toDraft(defaults)[key];
	return draft[key].limit === defaultRow.limit && draft[key].window === defaultRow.window;
}

/** A per-endpoint limit above the matching all-endpoints limit never applies. */
export function exceedsAllEndpointsLimit(
	draft: RateLimitDraft,
	key: 'endpointRead' | 'endpointWrite',
): boolean {
	const globalKey = key === 'endpointRead' ? 'globalRead' : 'globalWrite';
	const rate = (rowKey: RateLimitRowKey) => {
		const row = draft[rowKey];
		if (getRowError(row) !== undefined) return 0;
		const limit = parseLimit(row.limit);
		return limit === 0 ? 0 : limit / Number(row.window);
	};
	const endpointRate = rate(key);
	const globalRate = rate(globalKey);
	return endpointRate > 0 && globalRate > 0 && endpointRate > globalRate;
}

export function formatGroupSummary(
	settings: PublicApiRateLimitSettings,
	group: RateLimitGroup,
	i18n: ReturnType<typeof useI18n>,
): string {
	const { read, write } = RATE_LIMIT_GROUPS[group];
	const requests = (key: RateLimitRowKey, kind: 'reads' | 'writes') => {
		const count = settings[limitField(key)];
		return i18n.baseText(`settings.security.rateLimits.summary.${kind}`, {
			adjustToNumber: count,
			interpolate: { count: count.toLocaleString('en-US') },
		});
	};
	const window = (key: RateLimitRowKey) => {
		const seconds = settings[windowField(key)];
		return i18n.baseText('settings.security.rateLimits.summary.window', {
			adjustToNumber: seconds,
			interpolate: { count: seconds.toLocaleString('en-US') },
		});
	};

	const hasRead = settings[limitField(read)] > 0;
	const hasWrite = settings[limitField(write)] > 0;

	if (!hasRead && !hasWrite) return i18n.baseText('settings.security.rateLimits.summary.noLimit');
	if (!hasWrite) {
		return `${requests(read, 'reads')} / ${window(read)} · ${i18n.baseText('settings.security.rateLimits.summary.noWriteLimit')}`;
	}
	if (!hasRead) {
		return `${i18n.baseText('settings.security.rateLimits.summary.noReadLimit')} · ${requests(write, 'writes')} / ${window(write)}`;
	}
	if (settings[windowField(read)] === settings[windowField(write)]) {
		return `${requests(read, 'reads')} · ${requests(write, 'writes')} / ${window(read)}`;
	}
	return `${requests(read, 'reads')} / ${window(read)} · ${requests(write, 'writes')} / ${window(write)}`;
}
