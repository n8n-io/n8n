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
};

export function secretsProviderLogContext({
	providerName,
	providerDisplayName,
	operation,
}: SecretsProviderLogContext) {
	return {
		providerName,
		providerDisplayName,
		operation,
	};
}

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

export class SecretsProviderDisconnectionError extends SecretsProviderOperationalError {
	constructor(
		providerName: string,
		providerDisplayName: string,
		context?: SecretsProviderErrorContext,
	) {
		super(
			'External secrets provider disconnection failed',
			providerName,
			providerDisplayName,
			'disconnect',
			context,
		);
	}
}

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
