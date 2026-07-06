import { jsonParse } from 'n8n-workflow';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadAgentEvalTestCasesWithFiles } from '../data/agents';
import { EvalTestCaseSchema } from '../harness/schema';

// Validates the real shipped agents/*.json cases against the schema, and that
// the loader (which is what pnpm eval:agents actually reads) resolves them
// all with a populated intentExpectation — mirrors case-files-schema.test.ts
// for data/workflows.
const AGENTS_DIR = join(__dirname, '..', 'data', 'agents');
const caseFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'));

describe('agents case file schema validation', () => {
	it('finds the expected number of intent-resolution case files', () => {
		expect(caseFiles.length).toBe(38);
	});

	it.each(caseFiles)('%s parses against EvalTestCaseSchema', (file) => {
		const raw = jsonParse<unknown>(readFileSync(join(AGENTS_DIR, file), 'utf8'));
		const result = EvalTestCaseSchema.safeParse(raw);
		if (!result.success) {
			throw new Error(`${file} failed schema validation:\n${result.error.message}`);
		}
	});
});

describe('loadAgentEvalTestCasesWithFiles', () => {
	it('loads every case with a populated intentExpectation', () => {
		const cases = loadAgentEvalTestCasesWithFiles();
		expect(cases).toHaveLength(38);
		for (const { testCase, fileSlug } of cases) {
			expect(testCase.intentExpectation, `${fileSlug} is missing intentExpectation`).toBeDefined();
		}
	});

	it('prepends the intent-classification preamble to the first user turn', () => {
		const cases = loadAgentEvalTestCasesWithFiles('wf-schedule-weather-slack');
		expect(cases).toHaveLength(1);
		const firstTurn = cases[0].testCase.conversation?.[0];
		expect(firstTurn?.text).toContain('This is not a request to build or execute anything');
		expect(firstTurn?.text).toContain(
			'Every weekday at 9am, Slack me the Berlin weather forecast.',
		);
	});

	it('exposes exactly one of accepts or parts on every case', () => {
		const cases = loadAgentEvalTestCasesWithFiles();
		for (const { testCase, fileSlug } of cases) {
			const expectation = testCase.intentExpectation;
			if (!expectation) continue;
			const hasAccepts = expectation.accepts !== undefined;
			const hasParts = expectation.parts !== undefined;
			expect(hasAccepts !== hasParts, `${fileSlug} must set exactly one of accepts/parts`).toBe(
				true,
			);
		}
	});
});
