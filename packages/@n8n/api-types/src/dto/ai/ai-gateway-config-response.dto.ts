export interface AiGatewayProviderConfigEntry {
	gatewayPath: string;
	urlField: string;
	apiKeyField: string;
	[key: string]: unknown;
}

export interface AiGatewayConfigDto {
	nodes: string[];
	credentialTypes: string[];
	providerConfig: Record<string, AiGatewayProviderConfigEntry>;
}
