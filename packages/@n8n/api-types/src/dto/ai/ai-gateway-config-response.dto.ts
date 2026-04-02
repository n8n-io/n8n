export interface AiGatewayProviderConfigEntry {
	gatewayPath: string;
	urlField: string;
	apiKeyField: string;
}

export interface AiGatewayConfigDto {
	nodes: string[];
	credentialTypes: string[];
	providerConfig: Record<string, AiGatewayProviderConfigEntry>;
}
