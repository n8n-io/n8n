import { INTEGRATION_ERROR_CODES, type IntegrationErrorCode } from './integration-error-codes';

export interface IntegrationErrorResponse {
	ok: false;
	error: {
		code: IntegrationErrorCode;
		message: string;
	};
}

export function integrationError(
	code: IntegrationErrorCode,
	message: string,
): IntegrationErrorResponse {
	return { ok: false, error: { code, message } };
}

export function connectionUnavailable(): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.CONNECTION_NOT_AVAILABLE,
		'The integration connection is not currently available.',
	);
}

export function unsupportedQuery(platform: string, query: string): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.UNSUPPORTED_QUERY,
		`The active ${platform} connection does not support ${query}.`,
	);
}

export function unsupportedAction(platform: string, action: string): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
		`The active ${platform} connection does not support ${action}.`,
	);
}

export function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function stringProperty(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	return stringValue(value[key]);
}

export function numberProperty(value: unknown, key: string): number | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	return typeof property === 'number' ? property : undefined;
}

export function booleanProperty(value: unknown, key: string): boolean | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	return typeof property === 'boolean' ? property : undefined;
}

export function isoDateProperty(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	if (property instanceof Date) return property.toISOString();
	if (typeof property !== 'string' || property.length === 0) return undefined;
	const date = new Date(property);
	return Number.isNaN(date.getTime()) ? property : date.toISOString();
}

export function removeUndefinedValues<T extends Record<string, unknown>>(
	value: T,
): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}
