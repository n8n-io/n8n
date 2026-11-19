import { SUPPORTED_PII_CATEGORIES } from '@n8n/utils/redaction/pii-patterns';
import { redactText } from '@n8n/utils/redaction/redact-text';
import type { JSONValue } from '@n8n/utils/json/to-json-value';

import { HOLDOUT_SHARE } from './agent-determinism.constants';
import type { RecordedRun } from './agent-determinism.contracts';

export function redactJson(value: JSONValue): JSONValue {
	if (typeof value === 'string') {
		return redactText(value, { detect: SUPPORTED_PII_CATEGORIES }).text;
	}
	if (Array.isArray(value)) return value.map(redactJson);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, v]) => [key, redactJson(v ?? null)]),
		);
	}
	return value;
}

function redactRun(run: RecordedRun): RecordedRun {
	const input = redactJson(run.input);
	return {
		...run,
		input: input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {},
		output: redactJson(run.output),
		toolCalls: run.toolCalls.map((call) => ({
			...call,
			input: call.input === undefined ? undefined : redactJson(call.input),
			output: call.output === undefined ? undefined : redactJson(call.output),
		})),
	};
}

export function splitRuns(runs: RecordedRun[]) {
	const holdoutEvery = Math.round(1 / HOLDOUT_SHARE);
	const isHoldout = (index: number) => index % holdoutEvery === holdoutEvery - 1;

	return {
		train: runs.filter((_, index) => !isHoldout(index)).map(redactRun),
		holdout: runs.filter((_, index) => isHoldout(index)),
	};
}
