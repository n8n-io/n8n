import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadEvalDataQualityCases } from '../fixtures';

function makeRoot(): string {
	const root = mkdtempSync(join(tmpdir(), 'eval-data-quality-'));
	mkdirSync(join(root, 'workflows'), { recursive: true });
	mkdirSync(join(root, 'expectations'), { recursive: true });
	return root;
}

function writeJson(path: string, data: unknown): void {
	writeFileSync(path, JSON.stringify(data, null, 2));
}

const validWorkflow = {
	name: 'Sample',
	nodes: [{ name: 'Eval Trigger', type: 'n8n-nodes-base.evaluationTrigger', typeVersion: 4.7 }],
	connections: {},
};

const validSidecar = {
	minRowCount: 5,
	columns: [
		{ name: 'input', type: 'string' },
		{ name: 'expected_output', type: 'string' },
	],
	inputColumns: ['input'],
	expectedOutputColumns: ['expected_output'],
};

describe('loadEvalDataQualityCases', () => {
	it('returns an empty list when the workflows directory does not exist', () => {
		expect(loadEvalDataQualityCases({ rootDir: '/nonexistent-eval-quality-path' })).toEqual([]);
	});

	it('loads workflow + sidecar pairs sorted alphabetically', () => {
		const root = makeRoot();
		try {
			writeJson(join(root, 'workflows', 'b-second.json'), { ...validWorkflow, name: 'B' });
			writeJson(join(root, 'workflows', 'a-first.json'), { ...validWorkflow, name: 'A' });
			writeJson(join(root, 'expectations', 'a-first.dataset.json'), validSidecar);
			writeJson(join(root, 'expectations', 'b-second.dataset.json'), validSidecar);

			const cases = loadEvalDataQualityCases({ rootDir: root });

			expect(cases.map((c) => c.slug)).toEqual(['a-first', 'b-second']);
			expect(cases[0].workflow.name).toBe('A');
		} finally {
			rmSync(root, { recursive: true });
		}
	});

	it('throws when a sidecar is missing for a workflow fixture', () => {
		const root = makeRoot();
		try {
			writeJson(join(root, 'workflows', 'orphan.json'), validWorkflow);

			expect(() => loadEvalDataQualityCases({ rootDir: root })).toThrow(/Missing dataset sidecar/);
		} finally {
			rmSync(root, { recursive: true });
		}
	});

	it('throws when a sidecar fails schema validation', () => {
		const root = makeRoot();
		try {
			writeJson(join(root, 'workflows', 'sample.json'), validWorkflow);
			writeJson(join(root, 'expectations', 'sample.dataset.json'), { minRowCount: 'oops' });

			expect(() => loadEvalDataQualityCases({ rootDir: root })).toThrow(/Invalid dataset sidecar/);
		} finally {
			rmSync(root, { recursive: true });
		}
	});

	it('applies the filter option', () => {
		const root = makeRoot();
		try {
			writeJson(join(root, 'workflows', 'alpha.json'), validWorkflow);
			writeJson(join(root, 'workflows', 'beta.json'), validWorkflow);
			writeJson(join(root, 'expectations', 'alpha.dataset.json'), validSidecar);
			writeJson(join(root, 'expectations', 'beta.dataset.json'), validSidecar);

			const cases = loadEvalDataQualityCases({ rootDir: root, filter: 'alpha' });
			expect(cases.map((c) => c.slug)).toEqual(['alpha']);
		} finally {
			rmSync(root, { recursive: true });
		}
	});
});
