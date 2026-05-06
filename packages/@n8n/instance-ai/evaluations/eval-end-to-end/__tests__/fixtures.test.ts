import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadEvalEndToEndCases } from '../fixtures';

function makeFixtureRoot(workflows: Record<string, unknown>): string {
	const root = mkdtempSync(join(tmpdir(), 'eval-end-to-end-fixtures-'));
	mkdirSync(join(root, 'workflows'), { recursive: true });
	for (const [name, content] of Object.entries(workflows)) {
		writeFileSync(join(root, 'workflows', `${name}.json`), JSON.stringify(content), 'utf8');
	}
	return root;
}

describe('loadEvalEndToEndCases — mode detection', () => {
	it('marks a clean AI workflow as eligible', () => {
		const root = makeFixtureRoot({
			clean_ai: {
				name: 'Clean',
				nodes: [
					{
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						parameters: {},
					},
					{
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						parameters: { text: 'Summarize this.' },
					},
				],
				connections: {},
			},
		});

		try {
			const cases = loadEvalEndToEndCases({ rootDir: root });
			expect(cases).toHaveLength(1);
			expect(cases[0].mode).toBe('eligible');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('marks a workflow with EvaluationTrigger as already-configured', () => {
		const root = makeFixtureRoot({
			has_evals: {
				name: 'Already',
				nodes: [
					{
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						parameters: {},
					},
					{
						name: 'EvalTrigger',
						type: 'n8n-nodes-base.evaluationTrigger',
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: {},
			},
		});

		try {
			const cases = loadEvalEndToEndCases({ rootDir: root });
			expect(cases[0].mode).toBe('already-configured');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('marks a workflow with no langchain nodes as no-ai-nodes', () => {
		const root = makeFixtureRoot({
			no_ai: {
				name: 'Plain',
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 1,
						parameters: {},
					},
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: {},
			},
		});

		try {
			const cases = loadEvalEndToEndCases({ rootDir: root });
			expect(cases[0].mode).toBe('no-ai-nodes');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('marks a workflow whose root agent reads upstream JSON as structural-skip', () => {
		const root = makeFixtureRoot({
			reads_upstream: {
				name: 'Reads',
				nodes: [
					{
						name: 'Slack Trigger',
						type: 'n8n-nodes-base.slackTrigger',
						typeVersion: 1,
						parameters: {},
					},
					{
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						parameters: { text: "={{ $('Slack Trigger').item.json.text }}" },
					},
				],
				connections: {},
			},
		});

		try {
			const cases = loadEvalEndToEndCases({ rootDir: root });
			expect(cases[0].mode).toBe('structural-skip');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
