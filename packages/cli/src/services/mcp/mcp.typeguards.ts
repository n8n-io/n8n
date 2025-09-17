type UnknownRecord = Record<string, unknown>;

export type HttpHeaderAuthDecryptedData = {
	name: string;
	value?: unknown;
};

export type WithDecryptedData<T> = UnknownRecord & { data: T };

// Inferred typing for CredentialsService.getOne() is a bit too broad, so we need a custom type guard
// to ensure that the decrypted data has the expected structure without changing the service code.
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
