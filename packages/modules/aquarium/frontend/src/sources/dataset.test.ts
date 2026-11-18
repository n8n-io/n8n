import { DATASET_DEFAULT_WINDOW_SECONDS, DATASET_MAX_WORKFLOWS } from '../aquarium.constants';
import { parseDataset, readDatasetFile } from './dataset';

/** jsdom's `File` has no `text()`. Browsers have it. */
function jsonFile(content: string): File {
	const file = new File([content], 'set.json', { type: 'application/json' });
	Object.defineProperty(file, 'text', { value: async () => content });
	return file;
}

const workflow = (id: string, executionCount: number, extra: Record<string, unknown> = {}) => ({
	key: `workflow:${id}`,
	id,
	kind: 'workflow',
	name: `Workflow ${id}`,
	projectId: 'p1',
	nodeTypes: ['n8n-nodes-base.webhook'],
	metrics: {
		complexity: 4,
		executionCount,
		failedCount: 1,
		averageRunTimeMs: 500,
		waitingCount: 0,
		finishedCount: 0,
	},
	...extra,
});

const agent = (id: string) => ({
	key: `agent:${id}`,
	id,
	kind: 'agent',
	name: `Agent ${id}`,
	metrics: { complexity: null, executionCount: null, failedCount: null, averageRunTimeMs: null },
});

describe('parseDataset', () => {
	it('reads the scrape format and ignores unknown fields', () => {
		const dataset = parseDataset({
			meta: { instance: 'example.app.n8n.cloud', executionWindow: { approxHours: 4 } },
			projects: [{ id: 'p1', name: 'Project 1' }],
			entities: [workflow('1', 10), agent('a')],
		});

		expect(dataset).toMatchObject({ source: 'example.app.n8n.cloud', totalEntities: 2 });
		expect(dataset?.windowSeconds).toBe(4 * 3600);
		expect(dataset?.entities[0]).toEqual({
			key: 'workflow:1',
			id: '1',
			kind: 'workflow',
			name: 'Workflow 1',
			project: { id: 'p1', name: 'Project 1' },
			metrics: {
				complexity: 4,
				executionCount: 10,
				failedCount: 1,
				averageRunTimeMs: 500,
				waitingCount: 0,
				finishedCount: 0,
			},
		});
	});

	it('reads a complete design, and ignores an incomplete one', () => {
		const design = {
			nodeCount: 8,
			codeNodeCount: 2,
			branchNodeCount: 1,
			disabledNodeCount: 0,
			duplicateNodeCount: 1,
			subWorkflowCallCount: 0,
			waitNodeCount: 1,
			hasErrorWorkflow: true,
		};
		const dataset = parseDataset({
			entities: [workflow('1', 5, { design }), workflow('2', 3, { design: { nodeCount: 3 } })],
		});

		expect(dataset?.entities[0].design).toEqual(design);
		expect(dataset?.entities[1].design).toBeUndefined();
	});

	it('reads finished runs, or works them out for older files', () => {
		const withField = parseDataset({
			entities: [
				workflow('1', 5, {
					metrics: { executionCount: 5, waitingCount: 2, finishedCount: 3 },
				}),
			],
		});
		const older = parseDataset({
			entities: [workflow('1', 5, { metrics: { executionCount: 5, waitingCount: 5 } })],
		});

		expect(withField?.entities[0].metrics.finishedCount).toBe(3);
		expect(older?.entities[0].metrics.finishedCount).toBe(0);
	});

	it('names a project that the file does not list by its id', () => {
		const dataset = parseDataset({ entities: [workflow('1', 1, { projectId: 'p-missing' })] });

		expect(dataset?.entities[0].project).toEqual({ id: 'p-missing', name: 'p-missing' });
	});

	it('turns missing metrics into the smallest values', () => {
		const dataset = parseDataset({ entities: [agent('a')] });

		expect(dataset?.entities[0].metrics).toEqual({
			complexity: 1,
			executionCount: 0,
			failedCount: 0,
			averageRunTimeMs: 0,
			waitingCount: 0,
			finishedCount: 0,
		});
	});

	it('keeps the most-run workflows up to the limit, and drops duplicates', () => {
		const entities = Array.from({ length: DATASET_MAX_WORKFLOWS + 20 }, (_, i) =>
			workflow(String(i), i),
		);
		const dataset = parseDataset({ entities: [...entities, workflow('0', 9999)] });

		expect(dataset?.totalEntities).toBe(DATASET_MAX_WORKFLOWS + 20);
		expect(dataset?.entities).toHaveLength(DATASET_MAX_WORKFLOWS);
		expect(dataset?.entities[0].metrics.executionCount).toBe(DATASET_MAX_WORKFLOWS + 19);
		expect(dataset?.entities.some((e) => e.id === '0')).toBe(false);
	});

	it('caps failures at the execution count', () => {
		const dataset = parseDataset({
			entities: [workflow('1', 5, { metrics: { executionCount: 5, failedCount: 50 } })],
		});

		expect(dataset?.entities[0].metrics.failedCount).toBe(5);
	});

	it('reads the window from timestamps, or uses the default', () => {
		const withRange = parseDataset({
			meta: {
				executionWindow: { from: '2026-11-18T08:00:00.000Z', to: '2026-11-18T10:00:00.000Z' },
			},
			entities: [workflow('1', 1)],
		});
		const without = parseDataset({ entities: [workflow('1', 1)] });

		expect(withRange?.windowSeconds).toBe(7200);
		expect(without?.windowSeconds).toBe(DATASET_DEFAULT_WINDOW_SECONDS);
	});

	it.each([
		['null', null],
		['an array', []],
		['no entities', { meta: {} }],
		['only invalid entities', { entities: [{ id: 1 }, { id: 'x', kind: 'fish', name: 'x' }] }],
	])('rejects %s', (_label, raw) => {
		expect(parseDataset(raw)).toBeUndefined();
	});
});

describe('readDatasetFile', () => {
	it('parses a JSON file', async () => {
		const file = jsonFile(JSON.stringify({ entities: [workflow('1', 3)] }));

		expect((await readDatasetFile(file))?.entities).toHaveLength(1);
	});

	it('returns undefined for a file that is not JSON', async () => {
		const file = jsonFile('not json');

		expect(await readDatasetFile(file)).toBeUndefined();
	});
});
