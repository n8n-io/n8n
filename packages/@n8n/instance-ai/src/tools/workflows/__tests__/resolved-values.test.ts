import { wrapUntrustedData } from '@n8n/agents';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';

import type { ResolvedNodeParametersResult } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { fixtureOriginsOf, synthesizedFixtures } from '../next-workflow-build';
import { resolvedValueLines, resolvedValuesBlock } from '../resolved-values';

const node = (name: string, type: string, parameters: IDataObject) => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters,
});

const chain = (...names: string[]) =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, index) => [
				name,
				{ main: [[{ node: names[index + 1], type: 'main', index: 0 }]] },
			]),
	);

const resolution = (
	nodeName: string,
	parameters: IDataObject,
	resolved: IDataObject,
): ResolvedNodeParametersResult => ({
	nodeName,
	runIndex: 0,
	itemIndex: 0,
	parameters,
	resolved: wrapUntrustedData(JSON.stringify(resolved, null, 2), 'execution-output'),
	failedExpressions: [],
	emptyResolutions: [],
});

const simulate = (nodeName: string) => ({
	nodeName,
	verdict: 'simulate' as const,
	reason: 'test',
	confidence: 'high' as const,
	source: 'deterministic' as const,
});

const GET_ALL = '@n8n/nodes-base-next.notionDatabasePageGetAll';
const UPSERT = '@n8n/nodes-base-next.googleSheetsSheetAppendOrUpdate';

const upsertParameters = {
	matchOn: 'Deal ID',
	values: {
		'Deal ID': '={{ $json["Deal ID"] }}',
		Stage: '={{ $json.Stage }}',
		Region: '={{ $json.Region }}',
		Source: 'notion',
	},
};

const deals: WorkflowJSON = {
	name: 'Deals',
	connections: chain('Start', 'Get Deals', 'Build Rows', 'Is Open', 'Upsert'),
	nodes: [
		node('Start', 'n8n-nodes-base.manualTrigger', {}),
		node('Get Deals', GET_ALL, { database: 'x' }),
		node('Build Rows', '@n8n/nodes-base-next.itemsSet', {
			fields: {
				'Deal ID': '={{ $json.id }}',
				Stage: '={{ $json.property_stage }}',
				Region: 'EU',
			},
		}),
		node('Is Open', '@n8n/nodes-base-next.conditionIf', {
			where: {
				match: 'all',
				conditions: [
					{
						type: 'string',
						left: '={{ $json.Stage }}',
						test: { op: 'notEquals', right: 'Lost' },
					},
				],
			},
		}),
		node('Upsert', UPSERT, upsertParameters),
	],
};

function outcomeOf(
	workflow: WorkflowJSON,
	resourceFields: Map<string, Array<{ name: string; value: string }>> = new Map(),
): WorkflowBuildOutcome {
	const fixtures = synthesizedFixtures(workflow, {}, resourceFields);
	return {
		nodeSimulationPlan: Object.keys(fixtures).map(simulate),
		simulationFixtures: fixtures,
		fixtureOrigins: fixtureOriginsOf(fixtures, {}, resourceFields),
	} as WorkflowBuildOutcome;
}

describe('resolvedValueLines', () => {
	const outcome = outcomeOf(deals);
	const page = outcome.simulationFixtures?.['Get Deals']?.[0] ?? {};
	const resolutions = new Map([
		[
			'Is Open',
			resolution('Is Open', deals.nodes[3].parameters ?? {}, {
				where: { conditions: [{ left: page.property_stage }] },
			}),
		],
		[
			'Upsert',
			resolution('Upsert', upsertParameters, {
				matchOn: 'Deal ID',
				values: { 'Deal ID': page.id, Stage: page.property_stage, Region: 'EU', Source: 'notion' },
			}),
		],
	]);
	const lines = resolvedValueLines(deals, outcome, resolutions);

	it('traces a mapped field through Set to the page id and shows its hint', () => {
		expect(lines).toContain('Upsert (simulated)');
		expect(lines).toContainEqual(
			expect.stringMatching(
				/^ {2}values\["Deal ID"\] <- \$json\["Deal ID"\] = "[^"]+"? {2}\[Get Deals\.id: Notion page UUID, not a database property; synthesized\]$/,
			),
		);
	});

	it('tags a pattern key that no lookup confirmed', () => {
		expect(lines).toContain(
			'  values.Stage <- $json.Stage = "example property_stage"  [Get Deals.property_stage; pattern key]',
		);
	});

	it('shows the condition of a node that ran', () => {
		expect(lines).toContain('Is Open (ran)');
		expect(lines).toContain(
			'  where.conditions[0].left <- $json.Stage = "example property_stage"  [Get Deals.property_stage; pattern key]',
		);
	});

	it('tags a Set literal as a local run and skips literal parameters', () => {
		expect(lines).toContain(
			'  values.Region <- $json.Region = "EU"  [Build Rows.Region; local run]',
		);
		expect(lines.join('\n')).not.toContain('Source');
		expect(lines.join('\n')).not.toContain('matchOn');
	});

	it('tags a property key from a resource lookup', () => {
		const resourceFields = new Map([['Get Deals', [{ name: 'Stage', value: 'Stage|select' }]]]);
		const looked = resolvedValueLines(deals, outcomeOf(deals, resourceFields), resolutions);
		expect(looked).toContainEqual(
			expect.stringMatching(/^ {2}values\.Stage <- .*\[Get Deals\.property_stage; lookup\]$/),
		);
	});

	it('leaves out nodes that have no resolution', () => {
		expect(resolvedValueLines(deals, outcome, new Map())).toEqual([]);
	});

	it('shows at most 20 field lines', () => {
		const values = Object.fromEntries(
			Array.from({ length: 25 }, (_, index) => [`Column ${index}`, '={{ $json.id }}']),
		);
		const wide: WorkflowJSON = {
			...deals,
			nodes: deals.nodes.map((entry) =>
				entry.name === 'Upsert' ? { ...entry, parameters: { values } } : entry,
			),
		};
		const capped = resolvedValueLines(
			wide,
			outcomeOf(wide),
			new Map([['Upsert', resolution('Upsert', { values }, { values: {} })]]),
		);
		expect(capped.filter((line) => line.startsWith('  '))).toHaveLength(20);
		expect(capped.at(-1)).toBe('… 5 more mapped fields not shown');
	});

	it('tags the generated fixture of a legacy write node', () => {
		const legacy: WorkflowJSON = {
			name: 'Legacy',
			connections: chain('Start', 'Fetch', 'Post'),
			nodes: [
				node('Start', 'n8n-nodes-base.manualTrigger', {}),
				node('Fetch', 'n8n-nodes-base.httpRequest', { url: 'https://example.com' }),
				node('Post', 'n8n-nodes-base.slack', { text: '={{ $json.title }}' }),
			],
		};
		const plan = {
			nodeSimulationPlan: [simulate('Fetch'), simulate('Post')],
			simulationFixtures: { Fetch: [{ title: 'Hello' }], Post: [{ ok: true }] },
		};
		expect(
			resolvedValueLines(
				legacy,
				plan,
				new Map([['Post', resolution('Post', { text: '={{ $json.title }}' }, { text: 'Hello' })]]),
			),
		).toEqual(['Post (simulated)', '  text <- $json.title = "Hello"  [Fetch.title; mock]']);
	});
});

describe('resolvedValuesBlock', () => {
	it('wraps the lines as untrusted data and skips nodes that fail to resolve', async () => {
		const block = await resolvedValuesBlock({
			workflow: deals,
			outcome: outcomeOf(deals),
			resolve: async (nodeName) =>
				nodeName === 'Upsert'
					? resolution('Upsert', upsertParameters, { values: { Region: 'EU' } })
					: await Promise.reject(new Error('not reached')),
		});
		expect(block).toMatch(/^<untrusted_data source="verification" label="resolved-values">\n/);
		expect(block).toContain('Upsert (simulated)');
		expect(block).not.toContain('Is Open');
	});

	it('resolves only the nodes that the run reached', async () => {
		const resolve = vi.fn(
			async (nodeName: string) => await Promise.resolve(resolution(nodeName, {}, {})),
		);
		await resolvedValuesBlock({
			workflow: deals,
			outcome: outcomeOf(deals),
			reached: ['Start', 'Get Deals', 'Build Rows', 'Is Open'],
			resolve,
		});
		expect(resolve.mock.calls).toEqual([['Is Open']]);
	});
});
