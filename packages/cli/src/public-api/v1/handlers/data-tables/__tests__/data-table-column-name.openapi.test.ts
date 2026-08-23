import { DATA_TABLE_COLUMN_MAX_LENGTH, DATA_TABLE_COLUMN_REGEX } from '@n8n/api-types';
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { z } from 'zod';

describe('dataTableColumnName OpenAPI fragment', () => {
	const columnNameYmlSchema = z.object({
		minLength: z.number(),
		maxLength: z.number(),
		pattern: z.string(),
	});

	const expectedOpenApiColumnNameConstraints = {
		minLength: 1,
		maxLength: DATA_TABLE_COLUMN_MAX_LENGTH,
		pattern: DATA_TABLE_COLUMN_REGEX.source,
	} as const;

	it('matches column name validation constants from @n8n/api-types', () => {
		const ymlPath = path.join(__dirname, '../spec/schemas/dataTableColumnName.yml');
		const doc = columnNameYmlSchema.parse(parse(fs.readFileSync(ymlPath, 'utf8')));

		expect(doc.minLength).toBe(expectedOpenApiColumnNameConstraints.minLength);
		expect(doc.maxLength).toBe(expectedOpenApiColumnNameConstraints.maxLength);
		expect(doc.pattern).toBe(expectedOpenApiColumnNameConstraints.pattern);
	});
});
