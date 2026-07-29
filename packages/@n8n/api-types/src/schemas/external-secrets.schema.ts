import type { NodeParameterValueType, INodeProperties } from 'n8n-workflow';

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
