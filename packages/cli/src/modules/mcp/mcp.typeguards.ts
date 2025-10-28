// Inferred typing for CredentialsService.getOne() is a bit too broad, so we need custom type guards
// to ensure that the decrypted data has the expected structure without changing the service code.

import type { JSONRPCRequest } from './mcp.types';

type UnknownRecord = Record<string, unknown>;

export type HttpHeaderAuthDecryptedData = {
	name: string;
	value?: unknown;
};

export type WithDecryptedData<T> = UnknownRecord & { data: T };

export function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrows down credentials to those that have decrypted data of type HttpHeaderAuthDecryptedData.
 * @param value - The value to check.
 * @returns True if the value is of type WithDecryptedData<HttpHeaderAuthDecryptedData>, false otherwise.
 */
export function hasHttpHeaderAuthDecryptedData(
	value: unknown,
): value is WithDecryptedData<HttpHeaderAuthDecryptedData> {
	if (!isRecord(value)) return false;
	const obj = value;
	const dataCandidate = obj['data'];
	if (!isRecord(dataCandidate)) return false;
	const data = dataCandidate;
	return typeof data.name === 'string';
}

// JWT credential shapes and guards
export type JwtPassphraseDecryptedData = {
	keyType?: 'passphrase' | string;
	secret: string;
};

export type JwtPemKeyDecryptedData = {
	keyType?: 'pemKey' | string;
	privateKey?: string;
	publicKey?: string;
};

export function hasJwtSecretDecryptedData(
	value: unknown,
): value is WithDecryptedData<JwtPassphraseDecryptedData> {
	if (!isRecord(value)) return false;
	const obj = value;
	const dataCandidate = obj['data'];
	if (!isRecord(dataCandidate)) return false;
	const data = dataCandidate;
	return typeof data.secret === 'string';
}

export function hasJwtPemKeyDecryptedData(
	value: unknown,
): value is WithDecryptedData<JwtPemKeyDecryptedData> {
	if (!isRecord(value)) return false;
	const obj = value;
	const dataCandidate = obj['data'];
	if (!isRecord(dataCandidate)) return false;
	const data = dataCandidate;
	if (typeof data.keyType === 'string' && data.keyType === 'pemKey') return true;
	return typeof data.privateKey === 'string' || typeof data.publicKey === 'string';
}

// JSON-RPC request type guards for MCP
/**
 * Type guard to check if a value is a JSON-RPC request
 * @param value - The value to check
 * @returns True if the value matches the JSONRPCRequest structure
 */
export function isJSONRPCRequest(value: unknown): value is JSONRPCRequest {
	if (!isRecord(value)) return false;

	if ('jsonrpc' in value && typeof value.jsonrpc !== 'string') return false;

	if ('method' in value && typeof value.method !== 'string') return false;

	if ('params' in value && value.params !== undefined && !isRecord(value.params)) return false;

	if (
		'id' in value &&
		value.id !== null &&
		typeof value.id !== 'string' &&
		typeof value.id !== 'number'
	)
		return false;

	return true;
}
