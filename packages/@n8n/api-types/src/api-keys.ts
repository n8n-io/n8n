export type ApiKey = {
	id: string;
	label: string;
	apiKey: string;
	createdAt: string;
	updatedAt: string;
	/** Expiration date in unix timestamp. Null if API key never expire */
	expiresAt: number | null;
};

export type ApiKeyWithRawValue = ApiKey & { rawApiKey: string };
