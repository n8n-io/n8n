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
	 * Total counts per ownership filter. `counts[ownership]` is the total for
	 * the requested page (use it for pagination); both numbers are present so
	 * callers can render Mine/All tab badges without a second request. For
	 * non-admins `mine` and `all` are equal.
	 */
	counts: { mine: number; all: number };
};

export type ApiKeyAudience = 'public-api' | 'mcp-server-api';
