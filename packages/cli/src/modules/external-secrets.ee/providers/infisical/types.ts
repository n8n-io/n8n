export type InfisicalAuthMethod = 'universalAuth';

export interface InfisicalSettings {
	siteURL: string;
	projectId: string;
	environment: string;
	secretPath: string;
	authMethod: InfisicalAuthMethod;

	// Universal Auth
	clientId: string;
	clientSecret: string;
}

export interface InfisicalUniversalAuthLoginResponse {
	accessToken: string;
	expiresIn: number;
	accessTokenMaxTTL: number;
	tokenType: string;
}

export interface InfisicalSecret {
	secretKey: string;
	secretValue: string;
}

export interface InfisicalImport {
	secrets: InfisicalSecret[];
	secretPath: string;
	environment: string;
}

export interface InfisicalListSecretsResponse {
	secrets: InfisicalSecret[];
	imports: InfisicalImport[];
}
