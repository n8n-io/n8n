export function isObject(maybe: unknown): maybe is { [key: string]: unknown } {
	return typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe);
}
export type CodeNodeMode = 'runOnceForAllItems' | 'runOnceForEachItem';

export const REQUIRED_N8N_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem']);
