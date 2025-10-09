// Inferred typing for CredentialsService.getOne() is a bit too broad, so we need custom type guards
// to ensure that the decrypted data has the expected structure without changing the service code.

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null;
}

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
