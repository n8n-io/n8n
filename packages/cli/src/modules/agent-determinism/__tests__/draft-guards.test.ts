import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';

import type { RecordedRun } from '../agent-determinism.contracts';
import { wrapWithGuards } from '../draft-guards';

const node = (name: string, type = 'n8n-nodes-base.set'): NodeJSON => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
});

const draft: WorkflowJSON = {
	name: 'Draft',
	nodes: [node('Bug report', 'n8n-nodes-base.webhook'), node('lookup_owner'), node('Output')],
	connections: {
		'Bug report': { main: [[{ node: 'lookup_owner', type: 'main', index: 0 }]] },
		lookup_owner: { main: [[{ node: 'Output', type: 'main', index: 0 }]] },
	},
};

const run = (input: RecordedRun['input'], output: RecordedRun['output']): RecordedRun => ({
	id: 'run',
	succeeded: true,
	input,
	output,
	toolCalls: [],
	steps: { llmDecided: 1, codeDecided: 0 },
	totalTokens: null,
});

const fallback = {
	nodes: [node('Agent fallback')],
	connections: {},
	entryNodeName: 'Agent fallback',
};

const targets = (workflow: WorkflowJSON, from: string, branch: number) =>
	(workflow.connections[from]?.main?.[branch] ?? []).map((connection) => connection.node);

describe('wrapWithGuards', () => {
	const wrapped = wrapWithGuards(
		draft,
		[run({ title: 'a', component: 'api' }, { assignee: 'Core' })],
		fallback,
	);

	it('checks the input before the draft and sends a misfit to the fallback', () => {
		expect(targets(wrapped, 'Bug report', 0)).toEqual(['Input fits draft?']);
		expect(targets(wrapped, 'Input fits draft?', 0)).toEqual(['lookup_owner']);
		expect(targets(wrapped, 'Input fits draft?', 1)).toEqual(['Agent fallback']);
	});

	it('checks the final output after the Output node and sends a bad answer to the fallback', () => {
		expect(targets(wrapped, 'lookup_owner', 0)).toEqual(['Output']);
		expect(targets(wrapped, 'Output', 0)).toEqual(['Output looks right?']);
		expect(targets(wrapped, 'Output looks right?', 0)).toEqual([]);
		expect(targets(wrapped, 'Output looks right?', 1)).toEqual(['Agent fallback']);
	});

	it('checks for the keys every recorded input and output shares', () => {
		const check = (name: string) =>
			JSON.stringify(wrapped.nodes.find((candidate) => candidate.name === name)?.parameters);

		expect(check('Input fits draft?')).toContain('[\\"title\\",\\"component\\"]');
		expect(check('Output looks right?')).toContain('[\\"assignee\\"]');
	});
});
