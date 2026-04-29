import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { loadEvalSetupTopologyCases } from '../fixtures';

const fixtureRoots: string[] = [];

function makeFixtureRoot() {
	const rootDir = mkdtempSync(join(tmpdir(), 'eval-setup-topology-'));
	fixtureRoots.push(rootDir);
	mkdirSync(join(rootDir, 'workflows'), { recursive: true });
	mkdirSync(join(rootDir, 'datasets'), { recursive: true });
	mkdirSync(join(rootDir, 'expectations'), { recursive: true });
	return rootDir;
}

function writeJson(path: string, value: unknown) {
	writeFileSync(path, JSON.stringify(value, null, 2));
}

function writeWorkflow(rootDir: string, slug: string) {
	writeWorkflowFile(rootDir, slug, {
		id: 'workflow-1',
		name: 'Topology fixture workflow',
		active: true,
		nodes: [
			{
				name: 'Chat Trigger',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1,
				parameters: {},
			},
			{
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 2,
				parameters: {},
			},
		],
		connections: {
			'Chat Trigger': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
		},
		pinData: {},
	});
}

function writeWorkflowFile(rootDir: string, slug: string, workflow: unknown) {
	writeJson(join(rootDir, 'workflows', `${slug}.json`), workflow);
}

function writeRows(rootDir: string, slug: string, rows: unknown) {
	writeJson(join(rootDir, 'datasets', `${slug}.rows.json`), rows);
}

describe('loadEvalSetupTopologyCases', () => {
	afterEach(() => {
		for (const rootDir of fixtureRoots.splice(0)) {
			rmSync(rootDir, { recursive: true, force: true });
		}
	});

	it('loads a workflow, matching dataset rows, and optional sidecar from a temp root', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'chat_agent');
		writeRows(rootDir, 'chat_agent', [
			{
				question: 'What is n8n?',
				expected_answer: 'A workflow automation platform',
			},
		]);
		writeJson(join(rootDir, 'expectations', 'chat_agent.topology.json'), {
			targets: [
				{
					nodeName: 'AI Agent',
					expectedOutputColumns: ['expected_answer'],
				},
			],
			metrics: ['helpfulness'],
			allowNativeTestRunnerSmoke: true,
		});

		const cases = loadEvalSetupTopologyCases({ rootDir });

		expect(cases).toHaveLength(1);
		expect(cases[0]).toMatchObject({
			slug: 'chat_agent',
			workflow: {
				id: 'workflow-1',
				name: 'Topology fixture workflow',
				active: true,
			},
			datasetRows: [
				{
					question: 'What is n8n?',
					expected_answer: 'A workflow automation platform',
				},
			],
			datasetColumns: ['question', 'expected_answer'],
			sidecar: {
				targets: [
					{
						nodeName: 'AI Agent',
						mode: 'required',
						inputColumns: [],
						expectedOutputColumns: ['expected_answer'],
						actualOutputColumns: [],
						sideEffectNodes: [],
					},
				],
				excludeTargets: [],
				metrics: ['helpfulness'],
				allowNativeTestRunnerSmoke: true,
			},
		});
		expect(basename(cases[0].workflowPath)).toBe('chat_agent.json');
		expect(basename(cases[0].datasetPath)).toBe('chat_agent.rows.json');
		expect(cases[0].sidecarPath).toBe(join(rootDir, 'expectations', 'chat_agent.topology.json'));
	});

	it('ignores non-json files in fixture directories', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'chat_agent');
		writeRows(rootDir, 'chat_agent', [{ question: 'hello' }]);
		writeFileSync(join(rootDir, 'workflows', '.DS_Store'), 'ignored');
		writeFileSync(join(rootDir, 'workflows', 'README.md'), 'ignored');
		writeFileSync(join(rootDir, 'datasets', 'notes.txt'), 'ignored');
		writeFileSync(join(rootDir, 'expectations', 'notes.txt'), 'ignored');

		const cases = loadEvalSetupTopologyCases({ rootDir });

		expect(cases.map((testCase) => testCase.slug)).toEqual(['chat_agent']);
	});

	it('uses default sidecar values when the optional sidecar is missing', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'without_sidecar');
		writeRows(rootDir, 'without_sidecar', [{ question: 'hello' }]);

		const cases = loadEvalSetupTopologyCases({ rootDir });

		expect(cases[0].sidecarPath).toBeUndefined();
		expect(cases[0].sidecar).toEqual({
			targets: [],
			excludeTargets: [],
			metrics: ['correctness'],
			allowNativeTestRunnerSmoke: false,
		});
	});

	it('filters cases by slug substring', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'alpha_agent');
		writeRows(rootDir, 'alpha_agent', [{ question: 'alpha' }]);
		writeWorkflow(rootDir, 'beta_router');
		writeRows(rootDir, 'beta_router', [{ question: 'beta' }]);

		const cases = loadEvalSetupTopologyCases({ rootDir, filter: 'agent' });

		expect(cases.map((testCase) => testCase.slug)).toEqual(['alpha_agent']);
	});

	it('loads real-export-like workflows without name or active and preserves runtime fields', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflowFile(rootDir, 'real_export', {
			meta: {
				templateCredsSetupCompleted: true,
			},
			nodes: [
				{
					id: 'chat-trigger-id',
					name: 'Chat Trigger',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'agent-id',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [220, 0],
					parameters: {},
				},
			],
			pinData: {},
			connections: {
				'Chat Trigger': {
					main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
				},
			},
		});
		writeRows(rootDir, 'real_export', [{ question: 'hello' }]);

		const cases = loadEvalSetupTopologyCases({ rootDir });

		expect(cases[0].workflow).toMatchObject({
			id: '',
			name: 'real_export',
			active: false,
			meta: {
				templateCredsSetupCompleted: true,
			},
		});
		expect(cases[0].workflow.nodes[0]).toMatchObject({
			id: 'chat-trigger-id',
			position: [0, 0],
		});
	});

	it('wraps invalid workflow fixture parse errors with the failing file path', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflowFile(rootDir, 'invalid_workflow', {
			name: 'Invalid workflow',
			connections: {},
		});
		writeRows(rootDir, 'invalid_workflow', [{ question: 'hello' }]);

		expect(() => loadEvalSetupTopologyCases({ rootDir })).toThrow(
			`Invalid workflow fixture ${join(rootDir, 'workflows', 'invalid_workflow.json')}`,
		);
	});

	it('wraps invalid workflow connections errors with the failing file path', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflowFile(rootDir, 'invalid_connections', {
			name: 'Invalid connections workflow',
			nodes: [
				{
					name: 'Chat Trigger',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1,
					parameters: {},
				},
			],
			connections: {
				'Chat Trigger': {
					main: 'not-an-array',
				},
			},
		});
		writeRows(rootDir, 'invalid_connections', [{ question: 'hello' }]);

		expect(() => loadEvalSetupTopologyCases({ rootDir })).toThrow(
			`Invalid workflow fixture ${join(rootDir, 'workflows', 'invalid_connections.json')}`,
		);
	});

	it('wraps invalid JSON parse errors with the failing file path', () => {
		const rootDir = makeFixtureRoot();
		writeFileSync(join(rootDir, 'workflows', 'invalid_json.json'), '{');
		writeRows(rootDir, 'invalid_json', [{ question: 'hello' }]);

		expect(() => loadEvalSetupTopologyCases({ rootDir })).toThrow(
			`Invalid JSON fixture ${join(rootDir, 'workflows', 'invalid_json.json')}`,
		);
	});

	it('fails when matching dataset rows file is missing', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'missing_rows');

		expect(() => loadEvalSetupTopologyCases({ rootDir })).toThrow(
			'Missing dataset fixture for missing_rows',
		);
	});

	it('fails when a dataset column is not a valid DataTable column name', () => {
		const rootDir = makeFixtureRoot();
		writeWorkflow(rootDir, 'invalid_columns');
		writeRows(rootDir, 'invalid_columns', [{ '1bad': 'value' }]);

		expect(() => loadEvalSetupTopologyCases({ rootDir })).toThrow('Invalid dataset fixture');
	});
});
