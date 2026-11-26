import type { INodeExecutionData } from 'n8n-workflow';

/**
 * Values shorter than this stay as they are. A short value matches too much unrelated text
 * and would damage normal output. Tokens and API keys are longer.
 */
export const MIN_SCRUBBED_LENGTH = 6;

/** Error fields that `Object.keys` does not list. */
const ERROR_TEXT_FIELDS = ['message', 'description', 'stack'] as const;

const BEARER_PREFIX = /^Bearer\s+/i;

export type RuntimeCredentialValue = { alias: string; value: string };

export type RuntimeCredentialScrubber = {
	/** Returns copies of the outputs with the values replaced. Never changes the input. */
	scrubOutputs<T extends Array<INodeExecutionData[] | null> | null | undefined>(outputs: T): T;
	/** Replaces the values in the text fields of an error, in place. */
	scrubError(error: object): void;
};

const placeholder = (alias: string) => `[runtime credential: ${alias}]`;

const isPlainObject = (value: object): value is Record<string, unknown> => {
	const proto: unknown = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/**
 * Builds a function set that replaces each runtime credential value with
 * `[runtime credential: <alias>]`. An API can echo the token it received, and the echo must
 * not reach the execution data.
 *
 * A `Bearer ` prefix is also removed from each value, because the `bearer` transform sends
 * only the token. Returns `undefined` when no value is long enough to scrub.
 */
export function buildRuntimeCredentialScrubber(
	values: RuntimeCredentialValue[],
): RuntimeCredentialScrubber | undefined {
	const secrets = new Map<string, string>();
	for (const { alias, value } of values) {
		for (const candidate of [value, value.replace(BEARER_PREFIX, '')]) {
			if (candidate.length >= MIN_SCRUBBED_LENGTH && !secrets.has(candidate)) {
				secrets.set(candidate, alias);
			}
		}
	}
	if (secrets.size === 0) return undefined;

	// Longest first, so a value that contains another one is replaced whole.
	const ordered = [...secrets.entries()].sort(([a], [b]) => b.length - a.length);

	const scrubText = (text: string) =>
		ordered.reduce(
			(result, [value, alias]) =>
				result.includes(value) ? result.split(value).join(placeholder(alias)) : result,
			text,
		);

	/** Copy on write: a branch without a match keeps its identity. */
	const scrubValue = (value: unknown, inProgress: WeakSet<object>): unknown => {
		if (typeof value === 'string') return scrubText(value);
		if (typeof value !== 'object' || value === null || inProgress.has(value)) return value;

		const isArray = Array.isArray(value);
		if (!isArray && !isPlainObject(value)) return value;

		inProgress.add(value);
		let copy: unknown[] | Record<string, unknown> | undefined;
		const entries: Array<[string | number, unknown]> = isArray
			? value.map((entry: unknown, index) => [index, entry])
			: Object.entries(value);
		for (const [key, entry] of entries) {
			const scrubbed = scrubValue(entry, inProgress);
			if (scrubbed === entry) continue;
			copy ??= isArray ? [...value] : { ...value };
			(copy as Record<string | number, unknown>)[key] = scrubbed;
		}
		inProgress.delete(value);

		return copy ?? value;
	};

	const scrubError = (error: object) => {
		const record = error as Record<string, unknown>;
		for (const field of ERROR_TEXT_FIELDS) {
			const current = record[field];
			if (typeof current !== 'string') continue;
			const scrubbed = scrubText(current);
			if (scrubbed === current) continue;
			try {
				record[field] = scrubbed;
			} catch {
				// A read-only field cannot be changed.
			}
		}
		for (const key of Object.keys(record)) {
			if ((ERROR_TEXT_FIELDS as readonly string[]).includes(key)) continue;
			const descriptor = Object.getOwnPropertyDescriptor(record, key);
			if (!descriptor || !('value' in descriptor) || !descriptor.writable) continue;
			const scrubbed = scrubValue(descriptor.value, new WeakSet());
			if (scrubbed !== descriptor.value) record[key] = scrubbed;
		}
	};

	return {
		scrubOutputs(outputs) {
			if (!outputs) return outputs;
			return outputs.map((items) =>
				items === null
					? null
					: items.map((item) => {
							const json = scrubValue(item.json, new WeakSet()) as INodeExecutionData['json'];
							if (item.error) scrubError(item.error);
							return json === item.json ? item : { ...item, json };
						}),
			) as typeof outputs;
		},
		scrubError,
	};
}
