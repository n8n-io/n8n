// Inferred typing for CredentialsService.getOne() is a bit too broad, so we need custom type guards
// to ensure that the decrypted data has the expected structure without changing the service code.

type UnknownRecord = Record<string, unknown>;

export type HttpHeaderAuthDecryptedData = {
	name: string;
	value?: unknown;
};

export type WithDecryptedData<T> = UnknownRecord & { data: T };

/**
 * Narrows down credentials to those that have decrypted data of type HttpHeaderAuthDecryptedData.
 * @param value - The value to check.
 * @returns True if the value is of type WithDecryptedData<HttpHeaderAuthDecryptedData>, false otherwise.
 */
export function hasHttpHeaderAuthDecryptedData(
	value: unknown,
): value is WithDecryptedData<HttpHeaderAuthDecryptedData> {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as UnknownRecord;
	if (!('data' in obj) || typeof obj.data !== 'object' || obj.data === null) return false;
	const data = obj.data as UnknownRecord;
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
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as UnknownRecord;
	if (!('data' in obj) || typeof obj.data !== 'object' || obj.data === null) return false;
	const data = obj.data as UnknownRecord;
	return typeof data.secret === 'string';
}

export function hasJwtPemKeyDecryptedData(
	value: unknown,
): value is WithDecryptedData<JwtPemKeyDecryptedData> {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as UnknownRecord;
	if (!('data' in obj) || typeof obj.data !== 'object' || obj.data === null) return false;
	const data = obj.data as UnknownRecord;
	if (typeof data.keyType === 'string' && data.keyType === 'pemKey') return true;
	return typeof data.privateKey === 'string' || typeof data.publicKey === 'string';
}
