export function toMailString(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'symbol' || typeof value === 'function') return value.toString();
	if (Array.isArray(value)) {
		// Join like nodemailer does for address arrays, so expressions resolving
		// to a recipient list keep working instead of being JSON-stringified.
		return value.map(toMailString).filter(Boolean).join(', ');
	}
	return JSON.stringify(value);
}
