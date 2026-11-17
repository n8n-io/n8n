const MASK = '••••••••';

/** Builds the masked form of a secret from the start and the end that the UI may show. */
export function maskSecretParts(start: string, end: string): string {
	return `${start}${MASK}${end}`;
}

/**
 * Hides the middle of a secret and keeps its start and its end, for example
 * `n8n_••••••••xzQn`. A value too short to hide anything comes back unchanged.
 */
export function maskSecret(value: string, visibleStart = 4, visibleEnd = 4): string {
	if (value.length <= visibleStart + visibleEnd) return value;
	return maskSecretParts(value.slice(0, visibleStart), value.slice(-visibleEnd));
}
