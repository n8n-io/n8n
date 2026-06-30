import {
	buildHttpProviderErrorContext,
	type SafeContextValue,
} from '../../errors/secrets-provider-errors';

export type VaultProviderLogContext = {
	authMethod?: string;
	mountPath?: string;
	kvVersion?: string;
	vaultApiPath?: string;
	secretPath?: string;
	errorCode?: SafeContextValue;
	statusCode?: number;
	failedCount?: number;
	errorCodes?: Record<string, number>;
	sampleSecretPaths?: string[];
};

export function vaultErrorContext(
	error: unknown,
): Pick<VaultProviderLogContext, 'errorCode' | 'statusCode'> {
	return buildHttpProviderErrorContext(error);
}
