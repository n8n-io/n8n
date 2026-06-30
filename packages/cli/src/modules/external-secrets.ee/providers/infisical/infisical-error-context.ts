import { httpStatusFromError } from '@n8n/backend-network';

import {
	buildHttpProviderErrorContext,
	type SafeContextValue,
} from '../../errors/secrets-provider-errors';
import type { InfisicalSettings } from './types';

export type InfisicalProviderLogContext = {
	siteURL?: string;
	projectId?: string;
	environment?: string;
	secretPath?: string;
	authMethod?: string;
	endpoint?: string;
	errorCode?: SafeContextValue;
	statusCode?: number;
};

export function getInfisicalHttpStatus(error: unknown): number | undefined {
	return httpStatusFromError(error);
}

export function infisicalErrorContext(
	error: unknown,
): Pick<InfisicalProviderLogContext, 'errorCode' | 'statusCode'> {
	return buildHttpProviderErrorContext(error);
}

export function infisicalConnectSettingsContext(
	settings: InfisicalSettings,
): Pick<InfisicalProviderLogContext, 'siteURL' | 'projectId' | 'authMethod'> {
	return {
		siteURL: settings.siteURL,
		projectId: settings.projectId,
		authMethod: settings.authMethod,
	};
}

export function infisicalTestSettingsContext(
	settings: InfisicalSettings,
): Pick<InfisicalProviderLogContext, 'siteURL' | 'projectId'> {
	return {
		siteURL: settings.siteURL,
		projectId: settings.projectId,
	};
}

export function infisicalUpdateSettingsContext(
	settings: InfisicalSettings,
): Pick<InfisicalProviderLogContext, 'siteURL' | 'projectId' | 'environment' | 'secretPath'> {
	return {
		siteURL: settings.siteURL,
		projectId: settings.projectId,
		environment: settings.environment,
		secretPath: settings.secretPath,
	};
}
