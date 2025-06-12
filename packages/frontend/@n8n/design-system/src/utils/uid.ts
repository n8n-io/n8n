/**
 * Math.random should be unique because of its seeding algorithm.
 * Convert it to base 36 (numbers + letters), and grab the first 9 characters after the decimal.
 *
 */
export function uid(baseId?: string): string {
	return `${baseId ? `${baseId}-` : ''}${Math.random().toString(36).substring(2, 11)}`;
}
