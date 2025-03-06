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
};

export type ApiKeyWithRawValue = ApiKey & { rawApiKey: string };
