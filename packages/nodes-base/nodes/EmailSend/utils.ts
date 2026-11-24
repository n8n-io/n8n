export function toMailString(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'symbol' || typeof value === 'function') return value.toString();
	return JSON.stringify(value);
}

/** Like `toMailString`, but joins arrays. Use for address fields only, never for subject or body. */
export function toMailAddressString(value: unknown): string | undefined {
	if (Array.isArray(value)) return value.map(toMailAddressString).filter(Boolean).join(', ');
	return toMailString(value);
}
