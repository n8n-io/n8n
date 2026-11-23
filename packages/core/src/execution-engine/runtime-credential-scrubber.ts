import type { INodeExecutionData } from 'n8n-workflow';

/**
 * Shorter values match too much unrelated text, so they stay as they are. Trigger tokens and
 * API keys are longer than this.
 */
const MIN_SCRUBBED_LENGTH = 6;

/** Error fields that `Object.keys` does not list. */
const ERROR_TEXT_FIELDS = ['message', 'description', 'stack'] as const;

export type RuntimeCredentialScrubber = {
	scrubItems(outputs: Array<INodeExecutionData[] | null>): void;
	scrubError(error: object): void;
};

const placeholder = (alias: string) => `[runtime credential: ${alias}]`;

/**
 * Replaces every runtime credential value in node output with a placeholder. An API can echo
 * the header it received, and that echo must not reach the execution data.
 *
 * Returns `undefined` when the execution carries no value worth scrubbing.
 */
export function buildRuntimeCredentialScrubber(
	valuesByAlias: Record<string, unknown>,
): RuntimeCredentialScrubber | undefined {
	const secrets: Array<{ value: string; alias: string }> = [];
	for (const [alias, stored] of Object.entries(valuesByAlias)) {
		for (const value of Array.isArray(stored) ? stored : [stored]) {
			const text = typeof value === 'number' ? String(value) : value;
			if (typeof text === 'string' && text.length >= MIN_SCRUBBED_LENGTH) {
				secrets.push({ value: text, alias });
			}
		}
	}
	if (secrets.length === 0) return undefined;

	// Longest first, so a value that contains another one is replaced whole.
	secrets.sort((a, b) => b.value.length - a.value.length);

	const scrubText = (text: string) =>
		secrets.reduce(
			(result, { value, alias }) =>
				result.includes(value) ? result.split(value).join(placeholder(alias)) : result,
			text,
		);

	const seen = new WeakSet<object>();
	const scrubValue = (value: unknown): unknown => {
		if (typeof value === 'string') return scrubText(value);
		if (typeof value !== 'object' || value === null || seen.has(value)) return value;
		if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value;
		seen.add(value);

		if (Array.isArray(value)) {
			for (let index = 0; index < value.length; index++) value[index] = scrubValue(value[index]);
			return value;
		}

		const record = value as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			const descriptor = Object.getOwnPropertyDescriptor(record, key);
			if (descriptor && 'value' in descriptor && descriptor.writable) {
				record[key] = scrubValue(record[key]);
			}
		}
		return value;
	};

	return {
		scrubItems(outputs) {
			for (const items of outputs) {
				for (const item of items ?? []) {
					item.json = scrubValue(item.json) as INodeExecutionData['json'];
					if (item.error) this.scrubError(item.error);
				}
			}
		},
		scrubError(error) {
			const record = error as Record<string, unknown>;
			for (const field of ERROR_TEXT_FIELDS) {
				if (typeof record[field] === 'string') record[field] = scrubText(record[field]);
			}
			scrubValue(error);
		},
	};
}
