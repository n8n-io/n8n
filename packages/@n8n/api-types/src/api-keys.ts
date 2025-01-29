export type ApiKey = {
	id: string;
	label: string;
	apiKey: string;
	createdAt: string;
	updatedAt: string;
};

export type ApiKeyWithRawValue = ApiKey & { rawApiKey: string };
