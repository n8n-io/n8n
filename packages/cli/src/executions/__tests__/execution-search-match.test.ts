import type { IDataObject, IRunData, ISourceData, ITaskData } from 'n8n-workflow';

import { findSearchMatch, toAsciiLowerCase } from '../execution-search-match';

const run = (items: IDataObject[], source: Array<ISourceData | null> = []): ITaskData => ({
	startTime: 0,
	executionIndex: 0,
	executionTime: 1,
	executionStatus: 'success',
	source,
	data: { main: [items.map((json) => ({ json }))] },
});

describe('toAsciiLowerCase', () => {
	it('changes the letters A to Z and nothing else', () => {
		expect(toAsciiLowerCase('ENG-123 É Σ ß')).toBe('eng-123 É Σ ß');
	});
});

describe('findSearchMatch', () => {
	const runData: IRunData = {
		Webhook: [
			run([
				{
					headers: { host: 'example.com' },
					body: { issue: { identifier: 'ENG-123', url: 'https://linear.app/acme/issue/ENG-123' } },
				},
			]),
		],
		'Edit Fields': [
			run([{ summary: 'Closed 2 of 7', done: false }], [{ previousNode: 'Webhook' }]),
		],
	};

	it('returns nothing when there is no run data or no criteria', () => {
		expect(findSearchMatch(undefined, { text: 'eng-123' })).toBeUndefined();
		expect(findSearchMatch(runData, {})).toBeUndefined();
	});

	describe('node only', () => {
		it('matches a node that ran', () => {
			expect(findSearchMatch(runData, { nodeName: 'Edit Fields' })).toEqual({
				nodeName: 'Edit Fields',
			});
		});

		it('does not match a node that did not run', () => {
			expect(findSearchMatch(runData, { nodeName: 'Slack' })).toBeUndefined();
		});

		it('does not take an inherited object property for a node', () => {
			expect(findSearchMatch(runData, { nodeName: 'constructor' })).toBeUndefined();
		});
	});

	describe('text only', () => {
		it('reports the first node in run sequence, the field path and the text around the match', () => {
			expect(findSearchMatch(runData, { text: 'issue/eng-123' })).toEqual({
				nodeName: 'Webhook',
				source: 'output',
				path: 'body.issue.url',
				snippet: { before: 'https://linear.app/acme/', match: 'issue/ENG-123', after: '' },
			});
		});

		it('matches field names', () => {
			expect(findSearchMatch(runData, { text: 'identif' })).toMatchObject({
				nodeName: 'Webhook',
				path: 'body.issue.identifier',
				snippet: { before: '', match: 'identif', after: 'ier' },
			});
		});

		it('matches numbers and booleans as text', () => {
			const data: IRunData = { Code: [run([{ count: 31337, nested: [{ ok: true }] }])] };

			expect(findSearchMatch(data, { text: '31337' })).toMatchObject({ path: 'count' });
			expect(findSearchMatch(data, { text: 'true' })).toMatchObject({ path: 'nested[0].ok' });
		});

		it('quotes field names that are not identifiers', () => {
			const data: IRunData = { Code: [run([{ 'Content-Type': 'application/json' }])] };

			expect(findSearchMatch(data, { text: 'application' })).toMatchObject({
				path: '["Content-Type"]',
			});
		});

		it('ignores the case of A to Z only', () => {
			const data: IRunData = { Code: [run([{ name: 'Élodie MARTIN' }])] };

			expect(findSearchMatch(data, { text: 'Martin' })).toBeDefined();
			expect(findSearchMatch(data, { text: 'élodie' })).toBeUndefined();
		});

		it('shortens long text around the match and collapses whitespace', () => {
			const text = `${'a'.repeat(40)} line one\nline two NEEDLE tail\t${'b'.repeat(80)}`;
			const data: IRunData = { Code: [run([{ text }])] };

			const match = findSearchMatch(data, { text: 'needle' });

			expect(match?.snippet).toEqual({
				before: `…${'a'.repeat(11)} line one line two `,
				match: 'NEEDLE',
				after: ` tail ${'b'.repeat(44)}…`,
			});
		});

		it('searches all outputs and connection types of a run', () => {
			const task = run([]);
			task.data = {
				main: [[], null, [{ json: { branch: 'second output' } }]],
				ai_tool: [[{ json: { response: 'tool result' } }]],
			};
			const data: IRunData = { If: [task] };

			expect(findSearchMatch(data, { text: 'second output' })).toMatchObject({ path: 'branch' });
			expect(findSearchMatch(data, { text: 'tool result' })).toMatchObject({ path: 'response' });
		});

		it('does not search data outside the item JSON', () => {
			const task = run([{ visible: 'yes' }]);
			task.data!.main[0]![0].binary = {
				file: { data: 'hidden-payload', mimeType: 'text/plain' },
			};
			const data: IRunData = { Code: [task] };

			expect(findSearchMatch(data, { text: 'hidden-payload' })).toBeUndefined();
			expect(findSearchMatch(data, { text: 'previousNode' })).toBeUndefined();
		});

		it('terminates on data that refers to itself', () => {
			const json: IDataObject = { label: 'loop' };
			json.self = json;
			const data: IRunData = { Code: [run([json])] };

			expect(findSearchMatch(data, { text: 'absent' })).toBeUndefined();
			expect(findSearchMatch(data, { text: 'loop' })).toMatchObject({ path: 'label' });
		});
	});

	describe('text in a node', () => {
		it('matches the output of the node', () => {
			expect(findSearchMatch(runData, { nodeName: 'Edit Fields', text: 'closed' })).toMatchObject({
				nodeName: 'Edit Fields',
				source: 'output',
				path: 'summary',
			});
		});

		it('matches the input of the node, which is the output of its source', () => {
			expect(findSearchMatch(runData, { nodeName: 'Edit Fields', text: 'ENG-123' })).toMatchObject({
				nodeName: 'Edit Fields',
				source: 'input',
				path: 'body.issue.identifier',
			});
		});

		it('reads the input from the run and the output that the source names', () => {
			const data: IRunData = {
				If: [
					run([{ value: 'first run' }]),
					{
						...run([]),
						data: { main: [[{ json: { value: 'true branch' } }], [{ json: { value: 'needle' } }]] },
					},
				],
				Slack: [run([], [{ previousNode: 'If', previousNodeRun: 1, previousNodeOutput: 1 }])],
				Email: [run([], [{ previousNode: 'If', previousNodeRun: 1, previousNodeOutput: 0 }])],
			};

			expect(findSearchMatch(data, { nodeName: 'Slack', text: 'needle' })).toMatchObject({
				source: 'input',
			});
			expect(findSearchMatch(data, { nodeName: 'Email', text: 'needle' })).toBeUndefined();
		});

		it('does not match text that only other nodes hold', () => {
			expect(findSearchMatch(runData, { nodeName: 'Webhook', text: 'closed' })).toBeUndefined();
		});

		it('does not match when the node did not run', () => {
			expect(findSearchMatch(runData, { nodeName: 'Slack', text: 'ENG-123' })).toBeUndefined();
		});
	});
});
