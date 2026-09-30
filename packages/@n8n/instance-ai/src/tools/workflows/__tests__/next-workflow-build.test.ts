import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { InstanceAiContext } from '../../../types';
import {
	fetchResourceFields,
	lockNodeContracts,
	nextWorkspaceFiles,
	nodeOutputsDeclaration,
	synthesizedFixtures,
	usedNodeIds,
} from '../next-workflow-build';

const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { notion } from '@n8n/nodes/notion';
import { httpRequest } from "@n8n/nodes/httpRequest";`;

describe('next workflow build', () => {
	it('finds the node modules a source imports', () => {
		expect(usedNodeIds(source)).toEqual(['notion', 'httpRequest']);
	});

	it('generates the tsconfig and only the imported node modules', () => {
		const result = nextWorkspaceFiles(source);
		expect(result.ok && [...result.files.keys()]).toEqual([
			'tsconfig.next.json',
			'.n8n/node-outputs.d.ts',
			'.n8n/nodes/notion.ts',
			'.n8n/nodes/httpRequest.ts',
		]);
		expect(result.ok && result.files.get('.n8n/nodes/notion.ts')).toContain(
			'export const notion = {',
		);
	});

	it('names the typed modules when a source imports an unknown one', () => {
		expect(nextWorkspaceFiles("import { slack } from '@n8n/nodes/slack';")).toEqual({
			ok: false,
			errors: [expect.stringContaining('No typed node module "@n8n/nodes/slack"')],
		});
	});

	it('declares derived output types by node name', () => {
		const workflow: WorkflowJSON = {
			name: 'Done',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Done tasks',
					type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						database: 'x',
						where: {
							match: 'all',
							conditions: [
								{
									property: 'Completed',
									type: 'date',
									condition: { op: 'on_or_after', value: '2026-09-01' },
								},
							],
						},
					},
				},
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		expect(text).toContain('"Done tasks": {');
		expect(text).toContain('property_completed: {\n\t\t\t\tstart: string;');
		expect(synthesizedFixtures(workflow)['Done tasks']?.[0]).toMatchObject({
			property_completed: { start: '2026-09-15' },
		});
		expect(synthesizedFixtures(workflow, { 'Done tasks': [{ id: 'mine' }] })).toEqual({
			'Done tasks': [{ id: 'mine' }],
		});
	});

	describe('resource fields', () => {
		const databaseId = '0123456789abcdef0123456789abcdef';
		const tasks: WorkflowJSON = {
			name: 'Tasks',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Tasks',
					type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
					typeVersion: 1,
					position: [0, 0],
					parameters: { database: `https://www.notion.so/Tasks-${databaseId}` },
				},
			],
		};
		const fields = [
			{ name: 'Status', value: 'Status|status' },
			{ name: 'Story Points', value: 'Story Points|number' },
		];

		const makeContext = (
			exploreResources: ReturnType<typeof vi.fn>,
			credentials = [{ id: 'c1', name: 'Notion account', type: 'notionApi' }],
		) =>
			({
				nodeService: { exploreResources },
				credentialService: { list: vi.fn().mockResolvedValue(credentials) },
			}) as unknown as InstanceAiContext;

		it('lists properties with the sole accepted credential, data source first, then database', async () => {
			const exploreResources = vi
				.fn()
				.mockRejectedValueOnce(new Error('Could not find data source'))
				.mockResolvedValueOnce({ results: fields });
			const result = await fetchResourceFields(makeContext(exploreResources), tasks);
			expect(result.get('Tasks')).toEqual(fields);
			expect(exploreResources).toHaveBeenNthCalledWith(1, {
				nodeType: 'n8n-nodes-base.notion',
				version: 3,
				methodName: 'getFilterProperties',
				methodType: 'loadOptions',
				credentialType: 'notionApi',
				credentialId: 'c1',
				currentNodeParameters: {
					resource: 'databasePage',
					operation: 'getAll',
					dataSourceId: { __rl: true, mode: 'id', value: databaseId },
				},
			});
			expect(exploreResources.mock.calls[1]?.[0]).toMatchObject({
				version: 2.2,
				currentNodeParameters: { databaseId: { __rl: true, mode: 'id', value: databaseId } },
			});
		});

		it('skips the lookup when more than one credential could be bound', async () => {
			const exploreResources = vi.fn();
			const context = makeContext(exploreResources, [
				{ id: 'c1', name: 'Notion A', type: 'notionApi' },
				{ id: 'c2', name: 'Notion B', type: 'notionOAuth2Api' },
			]);
			expect((await fetchResourceFields(context, tasks)).size).toBe(0);
			expect(exploreResources).not.toHaveBeenCalled();
		});

		it('gives up on a slow lookup after 5 seconds', async () => {
			vi.useFakeTimers();
			try {
				const pending = fetchResourceFields(
					makeContext(vi.fn(async () => await new Promise(() => {}))),
					tasks,
				);
				await vi.advanceTimersByTimeAsync(5_000);
				expect((await pending).size).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});

		it('closes the output type and seeds fixtures with real property names', () => {
			const resourceFields = new Map([['Tasks', fields]]);
			const text = nodeOutputsDeclaration(tasks, resourceFields);
			expect(text).toContain('property_story_points: number | null;');
			expect(text).not.toContain('[key: `property_');
			expect(synthesizedFixtures(tasks, {}, resourceFields).Tasks?.[0]).toMatchObject({
				property_status: 'example',
				property_story_points: 1,
			});
		});
	});

	describe('lockNodeContracts', () => {
		const lock = JSON.parse(
			readFileSync(
				path.join(require.resolve('@n8n/nodes-base-next/package.json'), '..', 'versions/lock.json'),
				'utf8',
			),
		) as Record<string, { bundleHash: string; contractHash: string }>;
		const nodes = [
			{
				id: '1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				id: '2',
				name: 'Get',
				type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
				typeVersion: 1,
				position: [0, 0],
			},
		] as WorkflowJSON['nodes'];

		it('pins contract nodes to the frozen bundle of their version', () => {
			const locked = lockNodeContracts({ name: 'wf', nodes, connections: {} });
			const { bundleHash, contractHash } = lock['notion.databasePage.getAll@1'];

			expect(locked.meta).toEqual({
				nodeContracts: {
					'@n8n/nodes-base-next.notionDatabasePageGetAll@1': { bundleHash, contractHash },
				},
			});
		});

		it('leaves a workflow without contract nodes unchanged', () => {
			const workflow = { name: 'wf', nodes: [nodes[0]], connections: {} };
			expect(lockNodeContracts(workflow)).toBe(workflow);
		});
	});
});
