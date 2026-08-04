export type ServiceAccountCredential = {
	id: string;
	clientId: string;
	credentialType: string;
	userId: string;
	label?: string;
	createdAt: string;
};

/** The raw client secret is returned exactly once, on creation. */
export type ServiceAccountCredentialWithSecret = ServiceAccountCredential & {
	clientSecret: string;
};
