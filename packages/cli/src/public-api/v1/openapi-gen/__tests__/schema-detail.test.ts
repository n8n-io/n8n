import { isRecord } from '@n8n/utils/is-record';
import { parse } from 'yaml';

import { getGeneratedArtifacts } from '../generate';

/**
 * Two guards on the generated schemas. Both failures show up only once a schema is emitted at more
 * than one place, and both break express-openapi-validator at start-up rather than in any test — so
 * every legacy route 500s while the decorator routes still answer.
 */
function walk(
	node: unknown,
	visit: (key: string, value: unknown, parentKey: string | undefined) => string | undefined,
	trail: string[] = [],
): string[] {
	if (Array.isArray(node)) {
		return node.flatMap((item, index) => walk(item, visit, [...trail, String(index)]));
	}

	if (!isRecord(node)) return [];

	return Object.entries(node).flatMap(([key, value]) => {
		const found = visit(key, value, trail.at(-1));
		const here = [...trail, key];
		return [...(found ? [`${here.join('.')}: ${found}`] : []), ...walk(value, visit, here)];
	});
}

/**
 * A `z.custom` field carries no shape, so zod-to-openapi emits `{}` and the published spec documents
 * nothing. Annotate it with `.openapi({ type, properties, … })` in `@n8n/api-types`; the annotation is
 * spec text only and does not tighten validation.
 */
const emptyFieldSchema = (_key: string, value: unknown, parentKey: string | undefined) =>
	parentKey === 'properties' && isRecord(value) && Object.keys(value).length === 0
		? 'documents nothing'
		: undefined;

/**
 * ajv resolves schema ids with `allKeys`, so it walks into values that are not schemas at all —
 * `example` most of all — and reads a nested `id` as a schema `$id`. Two copies of the same `id` are
 * an ambiguous reference and the bundle fails to compile. An `id` under `properties` is a field name,
 * not a keyword, so it is fine.
 */
const idOutsideProperties = (key: string, _value: unknown, parentKey: string | undefined) =>
	(key === 'id' || key === '$id') && parentKey !== 'properties'
		? 'ajv reads this as a schema $id'
		: undefined;

describe('generated OpenAPI schemas', () => {
	const artifacts = getGeneratedArtifacts();

	it.each(artifacts)('$outputPath documents every field', ({ content }) => {
		expect(walk(parse(content), emptyFieldSchema)).toEqual([]);
	});

	it.each(artifacts)('$outputPath has no id ajv could read as a schema id', ({ content }) => {
		expect(walk(parse(content), idOutsideProperties)).toEqual([]);
	});
});
