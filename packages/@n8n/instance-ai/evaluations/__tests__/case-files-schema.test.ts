import { jsonParse } from 'n8n-workflow';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WorkflowTestCaseSchema } from '../data/workflows/schema';

// Validates the REAL shipped test-case JSONs against the schema. `data-workflows-schema.test.ts`
// mocks `fs`, so it can't catch a malformed real case; this reads the actual directory and parses
// every case — including the multi-line array `text` form used by long stage directions.
const WORKFLOWS_DIR = join(__dirname, '..', 'data', 'workflows');
const caseFiles = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.json'));

describe('case file schema validation', () => {
	it('finds at least one case file', () => {
		expect(caseFiles.length).toBeGreaterThan(0);
	});

	it.each(caseFiles)('%s parses against WorkflowTestCaseSchema', (file) => {
		const raw = jsonParse<unknown>(readFileSync(join(WORKFLOWS_DIR, file), 'utf8'));
		const result = WorkflowTestCaseSchema.safeParse(raw);
		if (!result.success) {
			throw new Error(`${file} failed schema validation:\n${result.error.message}`);
		}
	});
});
