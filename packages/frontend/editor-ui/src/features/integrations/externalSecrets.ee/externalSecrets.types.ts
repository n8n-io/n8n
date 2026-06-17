import type { INodeProperties } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';

export interface ExternalSecretsProviderSecret {
	key: string;
}

export type ExternalSecretsProviderData = Record<string, IUpdateInformation['value']>;

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
