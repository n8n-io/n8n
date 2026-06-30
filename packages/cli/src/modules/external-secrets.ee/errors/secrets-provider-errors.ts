import { OperationalError } from 'n8n-workflow';

type SafeContextValue = string | number | boolean | undefined;

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

/**
 * @deprecated Do not use this class because this is overkill for the purpose of logging.
 * Use `secretsProviderLogContext` instead.
 */
abstract class SecretsProviderOperationalError extends OperationalError {
	constructor(
		message: string,
		providerName: string,
		providerDisplayName: string,
		operation: SecretsProviderOperation,
		context: SecretsProviderErrorContext = {},
	) {
		super(message, {
			extra: {
				providerName,
				providerDisplayName,
				operation,
				...context,
			},
		});
		this.name = new.target.name;
	}
}

/**
 * @deprecated Do not use this class because this is overkill for the purpose of logging.
 * Use `secretsProviderLogContext` instead.
 */
export class SecretsProviderInitializationError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider initialization failed',
			providerName,
			providerDisplayName,
			'initialize',
			context,
		);
	}
}

export class SecretsProviderConnectionError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider connection failed',
			providerName,
			providerDisplayName,
			'connect',
			context,
		);
	}
}

/**
 * @deprecated Do not use this class because this is overkill for the purpose of logging.
 * Use `secretsProviderLogContext` instead.
 */
export class SecretsProviderUpdateError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider update failed',
			providerName,
			providerDisplayName,
			'update',
			context,
		);
	}
}

/**
 * @deprecated Do not use this class because this is overkill for the purpose of logging.
 * Use `secretsProviderLogContext` instead.
 */
export class SecretsProviderTestError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider test failed',
			providerName,
			providerDisplayName,
			'test',
			context,
		);
	}
}

/**
 * @deprecated Do not use this class because this is overkill for the purpose of logging.
 * Use `secretsProviderLogContext` instead.
 */
export class SecretsProviderTokenRefreshError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider token refresh failed',
			providerName,
			providerDisplayName,
			'tokenRefresh',
			context,
		);
	}
}
