import type { ApiKeyScope } from '@n8n/permissions';

/** Unix timestamp. Seconds since epoch */
export type UnixTimestamp = number | null;

export type ApiKeyOwner = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

export type ApiKey = {
	id: string;
	label: string;
	apiKey: string;
	createdAt: string;
	updatedAt: string;
	/** Null if API key never expires */
	expiresAt: UnixTimestamp | null;
	scopes: ApiKeyScope[];
	/** ISO timestamp of the last time the key authenticated a request, or null if never used. */
	lastUsedAt: string | null;
	/** The user who owns this key. Populated on list endpoints; absent on create. */
	owner?: ApiKeyOwner;
};

export type ApiKeyWithRawValue = ApiKey & { rawApiKey: string };

export type ApiKeyOwnership = 'mine' | 'all';

export type ApiKeyList = {
	items: ApiKey[];
	/**
	 * Per-ownership totals after the label filter is applied.
	 * `counts[ownership]` drives pagination of the returned page.
	 */
	counts: { mine: number; all: number };
	/**
	 * Per-ownership totals ignoring the label filter, so callers can render
	 * tab badges and empty-state CTAs against the true population. Equals
	 * `counts` when no label filter was passed.
	 */
	totals: { mine: number; all: number };
};

export type ApiKeyAudience = 'public-api' | 'mcp-server-api';
