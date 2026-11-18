import type { JSONValue } from '@n8n/utils/json/to-json-value';
import isEqual from 'lodash/isEqual';

export type TextJudge = (expected: string, actual: string) => Promise<boolean>;

function asText(value: JSONValue) {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function matchOutput(expected: JSONValue, actual: JSONValue | null, judge: TextJudge) {
	if (actual === null) return false;
	if (typeof expected === 'string') return await judge(expected, asText(actual));
	return isEqual(expected, actual);
}
