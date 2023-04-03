import type { RunningMode } from '@db/entities/AuthProviderSyncHistory';
import type { AuthenticatedRequest } from '@/requests';

export type ConnectionSecurity = 'none' | 'tls' | 'startTls';

export type ServiceProvider = 'custom' | 'google';

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
