import { parseWorkflowCodeToBuilder, type IDataObject, type WorkflowJSON } from '@n8n/workflow-sdk';

import { fetchResourceOutputs, validateContractInput, type ExploreResources } from '../build';
import { getExpressionService } from '../expression-check';
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
	nodes: Array<{
		name: string;
		type: string;
		parameters: IDataObject;
		credentials?: Record<string, { id: string; name: string }>;
	}>,
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

async function build(json: WorkflowJSON, explore?: ExploreResources) {
	const { workflow, issues, contractNodes } = compileContractNodes(json);
	const resourceOutputs = explore
		? await fetchResourceOutputs(workflow, contractNodes, explore)
		: undefined;
	return {
		workflow,
		issues: [
			...issues,
			...(await checkContractOutputReads(workflow, contractNodes, resourceOutputs)),
		],
	};
}

const post = (body: IDataObject) => ({
	name: 'Post',
	type: 'httpRequest.request',
	parameters: { method: 'POST', url: 'https://example.com', body: { kind: 'json', json: body } },
});

function hints(schema: unknown): string[] {
	if (typeof schema !== 'object' || schema === null) return [];
	return Object.entries(schema).flatMap(([key, value]) =>
		key === 'x-n8n-hint' && typeof value === 'string' ? [value] : hints(value),
	);
}

describe('contract lint', () => {
	it.each(CONTRACTS.map((contract) => [contract.id, contract] as const))(
		'%s keeps summary and hints within the prose budget',
		(_id, contract) => {
			expect(contract.summary.length).toBeLessThanOrEqual(120);
			expect(
				[...hints(contract.input), ...hints(contract.output)].filter((hint) => hint.length > 80),
			).toEqual([]);
		},
	);

	it.each(CONTRACTS.map((contract) => [contract.id, contract] as const))(
		'%s states no conditional requirement in prose',
		(_id, contract) => {
			expect(
				hints(contract.input).filter((hint) =>
					/\b(omit (for|when)|only (when|if)|required (when|if))\b/i.test(hint),
				),
			).toEqual([]);
		},
	);
});

describe('node contracts', () => {
	beforeAll(async () => {
		(await getExpressionService()).analyze('={{ 1 }}', { context: 'nodeParameter', nodes: {} });
	}, 60_000);

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
				database: { mode: 'id', id: '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e' },
				filter: {
					mode: 'conditions',
					match: 'all',
					conditions: [
						{
							property: 'Completed On',
							type: 'date',
							condition: { op: 'on_or_after', value: '2026-09-01' },
						},
						{ property: 'Owners', type: 'people', condition: { op: 'is_not_empty' } },
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

	describe('Set keep modes', () => {
		const source = {
			name: 'Source',
			type: 'set.fields',
			parameters: { fields: [{ name: 'total', value: '10', type: 'number' }] },
		};
		const addTax = (keep: IDataObject) => ({
			name: 'Tax',
			type: 'set.fields',
			parameters: {
				fields: [{ name: 'total_with_tax', value: '={{ $json.total * 1.2 }}', type: 'number' }],
				keep,
			},
		});
		const issuesFor = async (keep: IDataObject, expression: string) =>
			(await build(workflowOf([source, addTax(keep), post({ value: expression })]))).issues;

		it('passes upstream fields through when keeping all fields', async () => {
			expect(
				await issuesFor(
					{ mode: 'all' },
					'={{ $json.total.toFixed(2) }} {{ $json.total_with_tax }}',
				),
			).toEqual([]);
			expect(await issuesFor({ mode: 'all' }, '={{ $json.totl }}')).toHaveLength(1);
		});

		it('drops upstream fields that are not kept', async () => {
			expect(await issuesFor({ mode: 'none' }, '={{ $json.total }}')).toHaveLength(1);
			expect(
				await issuesFor({ mode: 'except', fields: ['total'] }, '={{ $json.total }}'),
			).toHaveLength(1);
		});
	});

	describe('resource schemas', () => {
		const notionCredentials = { notionApi: { id: 'cred-1', name: 'Notion account' } };
		const tasks = {
			name: 'Tasks',
			type: 'notion.databasePage.getAll',
			parameters: {
				database: { mode: 'id', id: '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e' },
				paging: { mode: 'all' },
				output: { mode: 'simplified' },
			},
			credentials: notionCredentials,
		};
		const dataSource: ExploreResources = async () =>
			await Promise.resolve({
				results: [
					{ name: 'Due Date', value: 'Due Date|date' },
					{ name: 'Tags', value: 'Tags|multi_select' },
				],
			});
		const issuesFor = async (expression: string, explore: ExploreResources) =>
			(await build(workflowOf([tasks, post({ value: expression })]), explore)).issues;

		it('types Notion properties from the data source and rejects unknown keys', async () => {
			expect(await issuesFor('={{ $json.property_tags.join(", ") }}', dataSource)).toEqual([]);
			expect(await issuesFor('={{ $json.property_due_date.start }}', dataSource)).toHaveLength(1);
			expect(await issuesFor('={{ $json.property_tag }}', dataSource)).toHaveLength(1);
		});

		it('keeps the open shape when the lookup fails', async () => {
			const failing: ExploreResources = async () => await Promise.reject(new Error('401'));
			expect(await issuesFor('={{ $json.property_anything }}', failing)).toEqual([]);
		});

		it('keeps the open shape when the node has no bound credential', async () => {
			const explore = vi.fn(dataSource);
			const unbound = { ...tasks, credentials: undefined };
			const { issues } = await build(
				workflowOf([unbound, post({ value: '={{ $json.property_anything }}' })]),
				explore,
			);
			expect(issues).toEqual([]);
			expect(explore).not.toHaveBeenCalled();
		});

		it('types Sheet rows from the header row', async () => {
			const sheet = {
				name: 'Rows',
				type: 'googleSheets.sheet.read',
				parameters: {
					spreadsheet: { mode: 'id', id: 'sheet-1' },
					sheet: { mode: 'name', name: 'Leads' },
				},
				credentials: { googleSheetsOAuth2Api: { id: 'cred-2', name: 'Google' } },
			};
			const headers: ExploreResources = async () =>
				await Promise.resolve({ results: [{ name: 'Email', value: 'Email' }] });
			const read = async (expression: string) =>
				(await build(workflowOf([sheet, post({ value: expression })]), headers)).issues;
			expect(await read('={{ $json.Email }} {{ $json.row_number }}')).toEqual([]);
			expect(await read('={{ $json.email }}')).toHaveLength(1);
		});
	});

	it('names the explicit read when $json misses a field of an earlier node', async () => {
		const customer = {
			name: 'Normalize Customer',
			type: 'set.fields',
			parameters: { fields: [{ name: 'email', value: 'a@b.test', type: 'string' }] },
		};
		const mail = {
			name: 'Mail',
			type: 'gmail.message.send',
			parameters: {
				to: 'x@y.test',
				subject: 'Hi',
				body: { format: 'text', text: 'Hello' },
			},
		};
		const { issues } = await build(
			workflowOf([customer, mail, post({ email: '={{ $json.email }}' })]),
		);
		expect(issues).toEqual([
			expect.objectContaining({
				code: 'CONTRACT_EXPRESSION_TYPE',
				message: expect.stringContaining("$('Normalize Customer').item.json.email"),
			}),
		]);
	});

	describe('IF contract', () => {
		const order = {
			name: 'Order',
			type: 'set.fields',
			parameters: {
				fields: [
					{ name: 'total', value: '120', type: 'number' },
					{ name: 'label', value: 'A', type: 'string' },
				],
			},
		};
		const check = (condition: IDataObject) => ({
			name: 'Large',
			type: 'if.condition',
			parameters: { conditions: [condition] },
		});

		it('compiles to an IF node with the operator metadata the runtime reads', async () => {
			const { workflow, issues } = await build(
				workflowOf([
					order,
					check({
						type: 'number',
						left: '={{ $json.total }}',
						condition: { op: 'gt', value: 100 },
					}),
				]),
			);
			expect(issues).toEqual([]);
			expect(workflow.nodes[1]).toMatchObject({
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				parameters: {
					conditions: {
						combinator: 'and',
						options: { typeValidation: 'strict', version: 2 },
						conditions: [
							{
								leftValue: '={{ $json.total }}',
								rightValue: 100,
								operator: { type: 'number', operation: 'gt' },
							},
						],
					},
					looseTypeValidation: false,
				},
			});
		});

		it('rejects a left expression of another type than the condition type', async () => {
			const { issues } = await build(
				workflowOf([
					order,
					check({ type: 'number', left: '={{ $json.label }}', condition: { op: 'gt', value: 1 } }),
				]),
			);
			expect(issues).toEqual([expect.objectContaining({ code: 'CONTRACT_EXPRESSION_TYPE' })]);
		});

		it('requires a comparison value exactly for binary operators', () => {
			const contract = CONTRACTS.find(({ id }) => id === 'if.condition');
			if (!contract) throw new Error('missing contract');
			const issues = (condition: IDataObject) =>
				validateContractInput(
					{ conditions: [{ type: 'boolean', left: true, condition }] },
					contract.input,
				);
			expect(issues({ op: 'true' })).toEqual([]);
			expect(issues({ op: 'true', value: true })).not.toEqual([]);
			expect(issues({ op: 'equals' })).not.toEqual([]);
		});

		it('passes the upstream type through to both outputs', async () => {
			const source = `
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const order = action('set.fields', { name: 'Order', parameters: { fields: [{ name: 'total', value: '120', type: 'number' }] } });
const large = action('if.condition', { name: 'Large', parameters: { conditions: [{ type: 'number', left: '={{ $json.total }}', condition: { op: 'gt', value: 100 } }] } });
const high = action('httpRequest.request', { name: 'High', parameters: { method: 'POST', url: 'https://x.test', body: { kind: 'json', json: { t: '={{ $json.total }}' } } } });
const low = action('httpRequest.request', { name: 'Low', parameters: { method: 'POST', url: 'https://y.test', body: { kind: 'json', json: { t: '={{ $json.totl }}' } } } });
export default workflow('w', 'W').add(start).to(order).to(large).onTrue(high).onFalse(low);`;
			const json = parseWorkflowCodeToBuilder(source).toJSON();
			expect(json.connections.Large.main[1]).toEqual([expect.objectContaining({ node: 'Low' })]);
			const { issues } = await build(json);
			expect(issues).toEqual([expect.objectContaining({ nodeName: 'Low' })]);
		});
	});

	it('rejects a resource value of the wrong kind', () => {
		const contract = (id: string) => {
			const found = CONTRACTS.find((candidate) => candidate.id === id);
			if (!found) throw new Error(`missing ${id}`);
			return found;
		};
		const notion = contract('notion.databasePage.getAll');
		const sheets = contract('googleSheets.sheet.read');
		const notionIssues = (id: string) =>
			validateContractInput({ ...notion.example, database: { mode: 'id', id } }, notion.input);
		const sheetsIssues = (id: string) =>
			validateContractInput(
				{ spreadsheet: { mode: 'id', id }, sheet: { mode: 'name', name: 'Leads' } },
				sheets.input,
			);

		expect(notionIssues('5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e')).toEqual([]);
		expect(notionIssues('https://www.notion.so/team/5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e')).toEqual([
			expect.stringContaining('is not a Notion ID'),
		]);
		expect(notionIssues('={{ $json.databaseId }}')).toEqual([]);
		expect(notionIssues('<__PLACEHOLDER_VALUE__Tasks database ID__>')).toEqual([]);
		expect(sheetsIssues('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')).toEqual([]);
		expect(sheetsIssues('https://docs.google.com/spreadsheets/d/1AbC/edit')).toEqual([
			expect.stringContaining('is not a spreadsheet ID, not a URL'),
		]);
	});

	it('shows valid contract parameters in an input error', async () => {
		const { issues } = await build(
			workflowOf([
				{
					name: 'Tax',
					type: 'set.fields',
					parameters: { mode: 'manual', fields: { values: [{ name: 't', type: 'numberValue' }] } },
				},
			]),
		);
		expect(issues).toEqual([
			expect.objectContaining({
				code: 'CONTRACT_INPUT_INVALID',
				message: expect.stringContaining('Valid parameters look like {"fields":[{"name":"email"'),
			}),
		]);
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
			condition: { op: operator, value },
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

		expect(view).toContain('people: Array<string> (one email per person, never a name)');
		expect(view).toContain('date: { \\"start\\": string; \\"end\\": string | null;');
		expect(view).toContain('[key: `property_');
	});

	it('rejects a Notion filter condition the property type does not support', () => {
		const notion = CONTRACTS.find(({ id }) => id === 'notion.databasePage.getAll');
		if (!notion) throw new Error('missing contract');
		const input = (condition: IDataObject) => ({
			...notion.example,
			filter: {
				mode: 'conditions',
				match: 'all',
				conditions: [{ property: 'Tags', type: 'multi_select', condition }],
			},
		});

		expect(validateContractInput(input({ op: 'contains', value: 'ops' }), notion.input)).toEqual(
			[],
		);
		expect(validateContractInput(input({ op: 'equals', value: 'ops' }), notion.input)).not.toEqual(
			[],
		);
	});

	it('requires a Notion condition value exactly for operators that compare against one', () => {
		const notion = CONTRACTS.find(({ id }) => id === 'notion.databasePage.getAll');
		if (!notion) throw new Error('missing contract');
		const issues = (condition: IDataObject) =>
			validateContractInput(
				{
					...notion.example,
					filter: {
						mode: 'conditions',
						match: 'all',
						conditions: [{ property: 'Due', type: 'date', condition }],
					},
				},
				notion.input,
			);

		expect(issues({ op: 'on_or_after', value: '2026-09-01' })).toEqual([]);
		expect(issues({ op: 'on_or_after' })).not.toEqual([]);
		expect(issues({ op: 'is_empty' })).toEqual([]);
		expect(issues({ op: 'past_week', value: 'x' })).not.toEqual([]);
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
