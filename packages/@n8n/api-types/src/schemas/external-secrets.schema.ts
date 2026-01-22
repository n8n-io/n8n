import type { NodeParameterValueType, INodeProperties, ProjectSharingData } from 'n8n-workflow';

export interface ExternalSecretsProviderSecret {
	key: string;
}

export type ExternalSecretsProviderData = Record<string, NodeParameterValueType>;

export type ExternalSecretsProviderProperty = INodeProperties;

export type ExternalSecretsProviderState = 'connected' | 'tested' | 'initializing' | 'error';

export interface ExternalSecretsProvider {
	icon: string;
	name: string;
	displayName: string;
	connected: boolean;
	connectedAt: string | false;
	state: ExternalSecretsProviderState;
	data?: ExternalSecretsProviderData;
	properties?: ExternalSecretsProviderProperty[];
}

export interface SecretProviderConnectionSecret {
	name: string;
	credentialsCount: number;
}

export type SecretProviderConnectionSettings = Record<string, NodeParameterValueType>;

export interface SecretProviderConnection {
	id: string;
	name: string;
	type: string;
	displayName: string;
	isGlobal: boolean;
	state: ExternalSecretsProviderState;
	enabled: boolean;
	settings?: SecretProviderConnectionSettings;
	homeProject?: ProjectSharingData;
	secretsCount: number;
	secrets: SecretProviderConnectionSecret[];
	createdAt: string;
	properties?: ExternalSecretsProviderProperty[];
}
