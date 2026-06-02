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
	count: number;
	/**
	 * Total per-scope counts. Always present, so callers can render Mine/All
	 * tab badges without making a second request. For non-admins both numbers
	 * are equal to `count`.
	 */
	counts: { mine: number; all: number };
};

export type ApiKeyAudience = 'public-api' | 'mcp-server-api';
