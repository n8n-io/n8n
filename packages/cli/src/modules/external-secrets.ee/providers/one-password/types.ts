import type { SecretsProviderSettings } from '../../types';

export type OnePasswordContext = SecretsProviderSettings<{
	serverUrl: string;
	accessToken: string;
}>;

export type OnePasswordSettings = {
	serverUrl: string;
	accessToken: string;
};
