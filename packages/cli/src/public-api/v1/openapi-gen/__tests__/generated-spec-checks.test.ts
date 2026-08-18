import { isRecord } from '@n8n/utils/is-record';
import { parse } from 'yaml';

import { getGeneratedArtifacts } from '../generate';

/**
 * The build writes the `*.generated.yml` spec files from the Zod DTOs. This reads each one back and
 * looks for two mistakes:
 *
 * 1. a field published as `{}`, which describes nothing to an API caller
 * 2. a value that ajv reads as a schema id, which stops the spec compiling
 *
 * No other test sees either one. They all read the hand-written source spec, and these files are not
 * part of it. The second mistake is the worse one: express-openapi-validator cannot start, so every
 * legacy route answers 500 while the whole test suite stays green.
 */
function problemsIn(node: unknown, path: string): string[] {
	if (Array.isArray(node)) {
		return node.flatMap((item, index) => problemsIn(item, `${path}[${index}]`));
	}

	if (!isRecord(node)) return [];

	const problems: string[] = [];

	for (const [key, value] of Object.entries(node)) {
		const here = `${path}.${key}`;

		// `properties` holds one entry per field, keyed by field name.
		if (key === 'properties' && isRecord(value)) {
			for (const [field, fieldSchema] of Object.entries(value)) {
				// zod-to-openapi has nothing to write for a `z.custom` field, so it emits `{}`. Give the
				// field an `.openapi({ type, … })` annotation in its DTO.
				if (isRecord(fieldSchema) && Object.keys(fieldSchema).length === 0) {
					problems.push(`${here}.${field} is published as {} and describes nothing`);
				}
				problems.push(...problemsIn(fieldSchema, `${here}.${field}`));
			}
			// A field is allowed to be called `id`, so skip the check below for these names.
			continue;
		}

		// ajv hunts for schema ids under every key, `example` included, so a stray `id` becomes one.
		// The same id in two files is ambiguous and the spec stops compiling. Rename the key, or leave
		// it out of the example.
		if (key === 'id' || key === '$id') {
			problems.push(`${here} is read by ajv as a schema id`);
		}

		problems.push(...problemsIn(value, here));
	}

	return problems;
}

describe('generated OpenAPI spec files', () => {
	it.each(getGeneratedArtifacts())('$outputPath', ({ content }) => {
		expect(problemsIn(parse(content), 'root')).toEqual([]);
	});
});
