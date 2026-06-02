import type { ApiKeyScope } from '@n8n/permissions';

/** Unix timestamp. Seconds since epoch */
export type UnixTimestamp = number | null;

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
};

export type ApiKeyWithRawValue = ApiKey & { rawApiKey: string };

export type ApiKeyList = {
	items: ApiKey[];
	count: number;
};

export type ApiKeyAudience = 'public-api' | 'mcp-server-api';
