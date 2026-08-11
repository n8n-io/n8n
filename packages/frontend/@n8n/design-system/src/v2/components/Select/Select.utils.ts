import type { AcceptableValue as RekaAcceptableValue } from 'reka-ui';

import type { SelectValue } from './Select.types';

/**
 * Reka UI's AcceptableValue excludes boolean. Encode public Select boolean
 * values to stable sentinels at the Reka boundary, then decode on the way out.
 */
const ENCODED_BOOLEAN_TRUE = '__n8n_select_boolean:true';
const ENCODED_BOOLEAN_FALSE = '__n8n_select_boolean:false';

/** Map a public Select value to a Reka-acceptable value. */
export function encodeSelectValue(value: SelectValue): string | number {
	if (value === true) {
		return ENCODED_BOOLEAN_TRUE;
	}
	if (value === false) {
		return ENCODED_BOOLEAN_FALSE;
	}
	return value;
}

/** Map a Reka value back to a public Select value. */
export function decodeSelectValue(value: unknown): SelectValue | undefined {
	if (value === ENCODED_BOOLEAN_TRUE) {
		return true;
	}
	if (value === ENCODED_BOOLEAN_FALSE) {
		return false;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}
	return undefined;
}

export function encodeSelectModelValue(
	value: SelectValue | SelectValue[] | undefined,
): RekaAcceptableValue | RekaAcceptableValue[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	return Array.isArray(value) ? value.map(encodeSelectValue) : encodeSelectValue(value);
}

export function decodeSelectModelValue(
	value: RekaAcceptableValue | RekaAcceptableValue[] | null | undefined,
): SelectValue | SelectValue[] | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (Array.isArray(value)) {
		const decoded: SelectValue[] = [];
		for (const entry of value) {
			const next = decodeSelectValue(entry);
			if (next !== undefined) {
				decoded.push(next);
			}
		}
		return decoded;
	}

	return decodeSelectValue(value);
}
