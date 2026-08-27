/**
 * n8n half of the allowlist-parsing contract.
 *
 * The Python runner enforces N8N_RUNNERS_STDLIB_ALLOW / N8N_RUNNERS_EXTERNAL_ALLOW;
 * n8n parses the same strings so it can tell the workflow builder what a Code node
 * may import. Both parsers read one fixture, so a change to either side that alters
 * the meaning fails here or in its Python twin
 * (packages/@n8n/task-runner-python/tests/unit/test_allowlist_parsing_contract.py)
 * rather than silently letting the builder describe a policy the runner does not
 * enforce.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildPythonImportPolicy } from '../python-import-policy';

const FIXTURE = path.resolve(
	__dirname,
	'../../../../../@n8n/task-runner-python/tests/fixtures/allowlist-parsing.json',
);

interface AllowlistCase {
	name: string;
	input: string;
	modules?: string[];
	invalid?: boolean;
}

const cases: AllowlistCase[] = JSON.parse(readFileSync(FIXTURE, 'utf8')).cases;
const validCases = cases.filter((c) => !c.invalid);
const invalidCases = cases.filter((c) => c.invalid);

/** The Python side returns a set, so agreement is order-insensitive. */
const parsed = (input: string) =>
	[...buildPythonImportPolicy({ stdlibAllow: input, externalAllow: '', mode: 'internal' }).stdlib]
		.sort()
		.join(',');

describe('allowlist parsing contract', () => {
	it('covers both outcomes', () => {
		// A fixture that lost all of one kind would make half the contract vacuous.
		expect(validCases.length).toBeGreaterThan(0);
		expect(invalidCases.length).toBeGreaterThan(0);
	});

	it.each(validCases)('parses "$input" to the agreed modules ($name)', ({ input, modules }) => {
		expect(parsed(input)).toBe([...modules!].sort().join(','));
	});

	// The runner refuses to start on these, so there is no allowlist to report. n8n
	// cannot throw here without breaking every unrelated build, so it reports the
	// wildcard instead — which makes downstream consumers treat the policy as
	// unverifiable and skip the import check rather than assert a precise list.
	it.each(invalidCases)('treats "$input" as unverifiable ($name)', ({ input }) => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: input, externalAllow: '', mode: 'internal' }).stdlib,
		).toContain('*');
	});

	it('parses the external allowlist by the same rules', () => {
		expect(
			buildPythonImportPolicy({
				stdlibAllow: '',
				externalAllow: 'pandas, ,numpy',
				mode: 'internal',
			}).external,
		).toEqual(['pandas', 'numpy']);
	});
});
