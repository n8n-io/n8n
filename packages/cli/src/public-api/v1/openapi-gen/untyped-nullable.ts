import { isRecord } from '@n8n/utils/is-record';

// These keys hold data, not schemas, so an example payload is never rewritten.
const DATA_VALUED_KEYS = new Set(['example', 'examples', 'default', 'enum']);

// ajv rejects `nullable` on these nodes too, but dropping it would stop them accepting `null`.
// Leave them unchanged: a composed nullable schema needs a fix at its source.
const COMPOSITION_KEYS = ['$ref', 'allOf', 'anyOf', 'oneOf', 'not'];

/**
 * Removes `nullable` from untyped schemas in place. zod-to-openapi emits `z.unknown()` and
 * `z.any()` as `{ nullable: true }`, which ajv rejects. An untyped schema already accepts `null`.
 */
export function stripUntypedNullable(node: unknown): void {
	if (Array.isArray(node)) {
		node.forEach((item) => stripUntypedNullable(item));
		return;
	}

	if (!isRecord(node)) {
		return;
	}

	// A boolean value means the keyword, not a property that happens to be named `nullable`.
	const declaresNullable = typeof node.nullable === 'boolean';
	const isComposed = COMPOSITION_KEYS.some((key) => key in node);
	if (declaresNullable && node.type === undefined && !isComposed) {
		delete node.nullable;
	}

	for (const [key, value] of Object.entries(node)) {
		if (DATA_VALUED_KEYS.has(key)) {
			continue;
		}
		stripUntypedNullable(value);
	}
}
