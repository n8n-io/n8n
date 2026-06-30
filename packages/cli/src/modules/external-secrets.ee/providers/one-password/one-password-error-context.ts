import {
	buildHttpProviderErrorContext,
	type SafeContextValue,
} from '../../errors/secrets-provider-errors';

export type OnePasswordProviderLogContext = {
	serverUrl?: string;
	endpoint?: string;
	errorCode?: SafeContextValue;
	statusCode?: number;
};

export function onePasswordErrorContext(
	error: unknown,
): Pick<OnePasswordProviderLogContext, 'errorCode' | 'statusCode'> {
	return buildHttpProviderErrorContext(error);
}
