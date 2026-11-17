/**
 * The Microsoft Teams library node (version 2) in the converter: the error settings of the
 * node and the paired items. The expected items are the run data of the v1 node in n8n's
 * engine for the same input items and responses (`recordV1` with `settings`).
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

function workflow(parameters: Record<string, unknown>, settings: Record<string, unknown> = {}) {
	return {
		name: 'Teams',
		nodes: [
			{
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Mark',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [100, 0],
				parameters: { assignments: { assignments: [] }, includeOtherFields: true, options: {} },
			},
			{
				name: 'Teams',
				type: 'n8n-nodes-base.microsoftTeams',
				typeVersion: 2,
				position: [200, 0],
				parameters,
				credentials: { microsoftTeamsOAuth2Api: { id: 'c1', name: 'Teams' } },
				...settings,
			},
			{
				name: 'Good',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: '1', name: 'from', value: "={{ $('Mark').item.json.id }}", type: 'string' },
						],
					},
					includeOtherFields: true,
					options: {},
				},
			},
			{
				name: 'Bad',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [400, 200],
				parameters: {},
			},
		],
		connections: {
			Start: { main: [[{ node: 'Mark', type: 'main', index: 0 }]] },
			Mark: { main: [[{ node: 'Teams', type: 'main', index: 0 }]] },
			Teams: {
				main: [
					[{ node: 'Good', type: 'main', index: 0 }],
					...(settings.onError === 'continueErrorOutput'
						? [[{ node: 'Bad', type: 'main', index: 0 }]]
						: []),
				],
			},
		},
	};
}

const answer = (status: number, body: unknown) => ({ status, headers: {}, body });
const getTask = { resource: 'task', operation: 'get', taskId: '={{ $json.id }}' };
const NOT_FOUND = 'The resource you are requesting could not be found';

async function run(
	parameters: Record<string, unknown>,
	settings: Record<string, unknown>,
	items: unknown[],
	answers: unknown[],
) {
	const out = convertWorkflow(workflow(parameters, settings), { trace: 'all' });
	expect(out.ok).toBe(true);
	expect(out.source).not.toContain("host: 'fallback'");
	expect(compile(out.source).diagnostics).toEqual([]);
	const result = await runReference(out.source, {
		trigger: { body: items, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Teams: answers },
		trace: true,
	});
	const itemsOf = (step: string): unknown => result.trace?.find((t) => t.step === step)?.items;
	return { result, itemsOf };
}

describe('Microsoft Teams library node under the error settings of the node', () => {
	const items = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
	const answers = [answer(200, { id: 't1' }), answer(404, {}), answer(200, { id: 't3' })];

	it('stops the workflow with the error of v1', async () => {
		const { result } = await run(getTask, {}, items, answers);
		expect(result.status).toBe('error');
		expect(JSON.stringify(result.result)).toContain(NOT_FOUND);
	});

	// `from` is the input item that v1 pairs with the output item (`paired` of the recording).
	it('gives an error item for the item that fails, paired as v1 pairs it', async () => {
		const { result, itemsOf } = await run(
			getTask,
			{ onError: 'continueRegularOutput' },
			items,
			answers,
		);
		expect(result.status).toBe('ok');
		expect(itemsOf('Teams')).toEqual([{ id: 't1' }, { error: NOT_FOUND }, { id: 't3' }]);
		expect(itemsOf('Good')).toEqual([
			{ id: 't1', from: 't1' },
			{ error: NOT_FOUND, from: 't2' },
			{ id: 't3', from: 't3' },
		]);
	});

	it('gives the failed item on the error output, with the input fields, as v1 does', async () => {
		const { result, itemsOf } = await run(
			getTask,
			{ onError: 'continueErrorOutput' },
			items,
			answers,
		);
		expect(result.status).toBe('ok');
		expect(itemsOf('Teams')).toEqual([
			[{ id: 't1' }, { id: 't3' }],
			[{ id: 't2', error: NOT_FOUND }],
		]);
		expect(itemsOf('Good')).toEqual([
			{ id: 't1', from: 't1' },
			{ id: 't3', from: 't3' },
		]);
	});

	it('gives the error of an id that is not valid as an error item', async () => {
		const { itemsOf } = await run(
			getTask,
			{ onError: 'continueRegularOutput' },
			[{ id: 't1' }, { id: 'a/b' }],
			[answer(200, { id: 't1' })],
		);
		expect(itemsOf('Teams')).toEqual([{ id: 't1' }, { error: 'The ID is not valid' }]);
	});

	it('pairs each item of a list with its input item', async () => {
		const { itemsOf } = await run(
			{ resource: 'chat', operation: 'getAll', returnAll: true },
			{},
			[{ id: 't1' }, { id: 't2' }],
			[answer(200, { value: [{ id: 'a' }, { id: 'b' }] })],
		);
		expect(itemsOf('Good')).toEqual([
			{ id: 'a', from: 't1' },
			{ id: 'b', from: 't1' },
			{ id: 'a', from: 't2' },
			{ id: 'b', from: 't2' },
		]);
	});
});
