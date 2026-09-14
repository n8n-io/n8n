// Type guards for pulling fields off `unknown` records — used wherever we
// inspect event payloads, run inputs/outputs, or other loosely-typed JSON.

import { isRecord } from '@n8n/utils/is-record';

export function getNestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	return isRecord(value) ? value : undefined;
}

export function getString(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	return typeof value === 'string' ? value : undefined;
}
