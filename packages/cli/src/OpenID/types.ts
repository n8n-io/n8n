import type { AuthenticatedRequest } from '@/requests';

export type ServiceProvider = 'custom' | 'google' | 'microsoft';

export interface OpenIDConfig {
	loginEnabled: boolean;
	discoveryEndpoint: string;
	clientId: string;
	clientSecret: string;
	serviceProvider: ServiceProvider;
	buttonName: string;
}

export interface DiscoveryEndpointResponse {
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint: string;
	issuer: string;
}

export declare namespace OpenIDConfiguration {
	type Update = AuthenticatedRequest<{}, {}, OpenIDConfig, {}>;
}
