import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';

import { validateContractInput } from '../build';
import { CONTRACTS } from '../contracts';
import { toObjectParameter } from '../helpers';
import {
	checkContractOutputReads,
	compileContractNodes,
	contractSignature,
	contractView,
	findContractForLegacyRequest,
} from '../index';

function workflowOf(
	nodes: Array<{ name: string; type: string; parameters: IDataObject }>,
): WorkflowJSON {
	return {
		name: 'test',
		nodes: nodes.map((node, index) => ({
			id: String(index),
			typeVersion: 1,
			position: [index * 200, 0],
			...node,
		})),
		connections: Object.fromEntries(
			nodes
				.slice(0, -1)
				.map((node, index) => [
					node.name,
					{ main: [[{ node: nodes[index + 1].name, type: 'main', index: 0 }]] },
				]),
		),
	};
}

async function build(json: WorkflowJSON) {
	const { workflow, issues, contractNodes } = compileContractNodes(json);
	return {
		workflow,
		issues: [...issues, ...(await checkContractOutputReads(workflow, contractNodes))],
	};
}

const post = (body: IDataObject) => ({
	name: 'Post',
	type: 'httpRequest.request',
	parameters: { method: 'POST', url: 'https://example.com', body: { kind: 'json', json: body } },
});

describe('node contracts', () => {
	it.each(CONTRACTS.map((contract) => [contract.id, contract] as const))(
		'%s example is valid contract input',
		(_id, contract) => {
			expect(validateContractInput(contract.example, contract.input)).toEqual([]);
		},
	);

	it('compiles a Set action to a manual-mode Set node with assignments', async () => {
		const { workflow, issues } = await build(
			workflowOf([
				{
					name: 'Tag',
					type: 'set.fields',
					parameters: { fields: [{ name: 'priority', value: 'normal', type: 'string' }] },
				},
			]),
		);

		expect(issues).toEqual([]);
		expect(workflow.nodes[0]).toMatchObject({
			type: 'n8n-nodes-base.set',
			typeVersion: 3.5,
			parameters: {
				mode: 'manual',
				includeOtherFields: false,
				assignments: { assignments: [{ name: 'priority', value: 'normal', type: 'string' }] },
			},
		});
	});

	it('flags reads of fields a Set action does not output', async () => {
		const set = {
			name: 'Tag',
			type: 'set.fields',
			parameters: {
				fields: [{ name: 'meta.priority', value: 'normal', type: 'string' }],
			},
		};

		expect(
			(await build(workflowOf([set, post({ p: '={{ $json.meta.priority }}' })]))).issues,
		).toEqual([]);
		expect((await build(workflowOf([set, post({ p: '={{ $json.priority }}' })]))).issues).toEqual([
			expect.objectContaining({ code: 'CONTRACT_EXPRESSION_TYPE', nodeName: 'Post' }),
		]);
	});

	it('checks Gmail reads against the selected output variant', async () => {
		const gmail = (mode: string) => ({
			name: 'Mail',
			type: 'gmail.message.getAll',
			parameters: { paging: { mode: 'limit', max: 1 }, output: { mode } },
		});

		const read = post({ from: '={{ $json.from.value[0].address }}', body: '={{ $json.text }}' });
		expect((await build(workflowOf([gmail('raw'), read]))).issues).toEqual([]);

		const simplifiedIssues = (await build(workflowOf([gmail('simplified'), read]))).issues;
		expect(simplifiedIssues.map(({ code }) => code)).toEqual([
			'CONTRACT_EXPRESSION_TYPE',
			'CONTRACT_EXPRESSION_TYPE',
		]);

		expect(
			(await build(workflowOf([gmail('raw'), post({ from: '={{ $json.from.address }}' })]))).issues,
		).toHaveLength(1);
	});

	describe('Notion properties typed by filter conditions', () => {
		const doneTasks = {
			name: 'Tasks',
			type: 'notion.databasePage.getAll',
			parameters: {
				database: { mode: 'id', id: 'abc' },
				filter: {
					mode: 'conditions',
					match: 'all',
					conditions: [
						{
							property: 'Completed On',
							type: 'date',
							condition: 'on_or_after',
							value: '2026-09-01',
						},
						{ property: 'Owners', type: 'people', condition: 'is_not_empty' },
					],
				},
				paging: { mode: 'all' },
				output: { mode: 'simplified' },
			},
		};
		const issuesFor = async (expression: string) =>
			(await build(workflowOf([doneTasks, post({ value: expression })]))).issues;

		it('rejects string methods on a date property object', async () => {
			expect(await issuesFor('={{ $json.property_completed_on.slice(0, 10) }}')).toEqual([
				expect.objectContaining({ code: 'CONTRACT_EXPRESSION_TYPE', nodeName: 'Post' }),
			]);
		});

		it('accepts the start of a date property and joined people emails', async () => {
			expect(
				await issuesFor(
					'={{ $json.property_completed_on.start.slice(0, 10) }} {{ $json.property_owners.join(", ") }}',
				),
			).toEqual([]);
		});

		it('keeps a property nullable when the filter does not require a value', async () => {
			const anyMatch = {
				...doneTasks,
				parameters: {
					...doneTasks.parameters,
					filter: { ...doneTasks.parameters.filter, match: 'any' },
				},
			};
			const issues = (
				await build(
					workflowOf([anyMatch, post({ value: '={{ $json.property_completed_on.start }}' })]),
				)
			).issues;
			expect(issues).toEqual([expect.objectContaining({ code: 'CONTRACT_EXPRESSION_TYPE' })]);
		});

		it('rejects an object where the slot expects a string', async () => {
			const issues = (
				await build(
					workflowOf([
						doneTasks,
						{
							name: 'Post',
							type: 'httpRequest.request',
							parameters: { method: 'GET', url: '={{ $json.property_completed_on }}' },
						},
					]),
				)
			).issues;
			expect(issues).toEqual([expect.objectContaining({ code: 'CONTRACT_EXPRESSION_TYPE' })]);
		});
	});

	it('keeps reads of non-contract nodes loose', async () => {
		const code = { name: 'Code', type: 'n8n-nodes-base.code', parameters: {} };
		expect(
			(await build(workflowOf([code, post({ v: '={{ $json.anything.goes.slice(1) }}' })]))).issues,
		).toEqual([]);
	});

	it('checks $() reads against Notion simplified property keys', async () => {
		const notion = {
			name: 'Task',
			type: 'notion.databasePage.getAll',
			parameters: {
				database: { mode: 'pick' },
				paging: { mode: 'all' },
				output: { mode: 'simplified' },
			},
		};

		expect(
			(await build(workflowOf([notion, post({ s: "={{ $('Task').item.json.property_status }}" })])))
				.issues,
		).toEqual([]);
		expect(
			(
				await build(
					workflowOf([notion, post({ s: "={{ $('Task').item.json.properties.Status }}" })]),
				)
			).issues,
		).toHaveLength(1);
	});

	it('compiles Notion filter conditions to the value keys the v3 node reads', async () => {
		const condition = (type: string, operator: string, value: unknown) => ({
			property: 'P',
			type,
			condition: operator,
			value,
		});
		const { workflow, issues } = await build(
			workflowOf([
				{
					name: 'Tasks',
					type: 'notion.databasePage.getAll',
					parameters: {
						database: { mode: 'pick' },
						filter: {
							mode: 'conditions',
							match: 'all',
							conditions: [
								condition('title', 'equals', 'Launch'),
								condition('multi_select', 'contains', 'ops'),
								condition('date', 'equals', '2026-01-01'),
								condition('people', 'contains', 'user-id'),
							],
						},
						paging: { mode: 'all' },
						output: { mode: 'simplified' },
					},
				},
			]),
		);

		expect(issues).toEqual([]);
		expect(workflow.nodes[0].parameters?.filters).toEqual({
			conditions: [
				{ key: 'P|title', type: 'title', condition: 'equals', richTextValue: 'Launch' },
				{ key: 'P|multi_select', type: 'multi_select', condition: 'contains', optionValue: 'ops' },
				{ key: 'P|date', type: 'date', condition: 'equals', dateValue: '2026-01-01' },
				{ key: 'P|people', type: 'people', condition: 'contains', peopleValue: 'user-id' },
			],
		});
	});

	it('tells the builder how Notion simplifies people and date values', () => {
		const notion = CONTRACTS.find(({ id }) => id === 'notion.databasePage.getAll');
		const view = JSON.stringify(notion && contractView(notion));

		expect(view).toContain('people: array of email strings');
		expect(view).toContain('^property_');
	});

	it('rejects a Notion filter condition the property type does not support', () => {
		const notion = CONTRACTS.find(({ id }) => id === 'notion.databasePage.getAll');
		if (!notion) throw new Error('missing contract');
		const input = (condition: string) => ({
			...notion.example,
			filter: {
				mode: 'conditions',
				match: 'all',
				conditions: [{ property: 'Tags', type: 'multi_select', condition, value: 'ops' }],
			},
		});

		expect(validateContractInput(input('contains'), notion.input)).toEqual([]);
		expect(validateContractInput(input('equals'), notion.input)).not.toEqual([]);
	});

	it('rejects legacy parameters, expression selectors, and expression binary field names', async () => {
		const issues = async (parameters: IDataObject, type: string) =>
			(await build(workflowOf([{ name: 'Node', type, parameters }]))).issues.map(
				({ code }) => code,
			);

		expect(
			await issues(
				{ paging: { mode: 'all' }, output: { mode: 'raw' }, simple: false },
				'gmail.message.getAll',
			),
		).toEqual(['CONTRACT_INPUT_INVALID']);
		expect(
			await issues(
				{ paging: { mode: '={{ "all" }}' }, output: { mode: 'raw' } },
				'gmail.message.getAll',
			),
		).toEqual(['CONTRACT_INPUT_INVALID']);
		expect(
			await issues(
				{ url: 'https://x', body: { kind: 'binary', binaryField: '={{ $binary.data }}' } },
				'httpRequest.request',
			),
		).toEqual(['CONTRACT_INPUT_INVALID']);
	});

	it('leaves legacy nodes untouched', async () => {
		const legacy = { name: 'Legacy', type: 'n8n-nodes-base.noOp', parameters: {} };
		expect((await build(workflowOf([legacy]))).workflow.nodes[0]).toMatchObject(legacy);
	});

	it('turns a JSON body with expression leaves into one object expression', () => {
		expect(toObjectParameter({ message: 'Line 1\nLine "2"', to: '={{ $json.user }}' })).toBe(
			'={{ { "message": "Line 1\\nLine \\"2\\"", "to": ($json.user) } }}',
		);
		expect(toObjectParameter({ greeting: '=Hi {{ $json.name }}!' })).toBe(
			'={{ { "greeting": `Hi $' + '{$json.name}!` } }}',
		);
		expect(toObjectParameter({ plain: 1 })).toEqual({ plain: 1 });
	});

	it('shows every variant output without a second request', () => {
		const contract = findContractForLegacyRequest('n8n-nodes-base.gmail', {
			resource: 'message',
			operation: 'getAll',
		});
		if (!contract) throw new Error('missing contract');

		expect(contractSignature(contract).selectors).toEqual({
			'paging.mode': ['all', 'limit'],
			'output.mode': ['simplified', 'raw'],
		});
		const view = JSON.stringify(contractView(contract).input);
		expect(view).toContain('Plain-text body');
		expect(view).not.toContain('Pass variants');
	});
});
