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

export interface LdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: ConnectionSecurity;
	connectionPort: number;
	baseDn: string;
	bindingAdminDn: string;
	bindingAdminPassword: string;
	firstNameAttribute: string;
	lastNameAttribute: string;
	emailAttribute: string;
	loginIdAttribute: string;
	ldapIdAttribute: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: number; // minutes
	searchPageSize: number;
	searchTimeout: number;
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
