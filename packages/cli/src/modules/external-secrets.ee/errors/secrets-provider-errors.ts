type SafeContextValue = string | number | boolean | undefined;

/**
 * @deprecated Do not use this interface because it exposes provider-specific internals in a shared type.
 * Use `SecretsProviderLogContext` for common fields and a provider-specific log context type for the rest.
 */
export interface SecretsProviderErrorContext {
	authMethod?: SafeContextValue;
	errorCode?: SafeContextValue;
	kvVersion?: SafeContextValue;
	location?: SafeContextValue;
	mountPath?: SafeContextValue;
	resource?: SafeContextValue;
	statusCode?: SafeContextValue;
}

type SecretsProviderOperation =
	| 'initialize'
	| 'connect'
	| 'disconnect'
	| 'update'
	| 'test'
	| 'tokenRefresh';

type SecretsProviderLogContext = {
	providerName: string;
	providerDisplayName: string;
	operation: SecretsProviderOperation;
	errorName?: string;
};

export function secretsProviderLogContext({
	providerName,
	providerDisplayName,
	operation,
	errorName,
}: SecretsProviderLogContext) {
	return {
		providerName,
		providerDisplayName,
		operation,
		errorName,
	};
}
