import { UI_EXTENSION_DATA_LIMITS, type UiExtensionRun } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { effectScope, ref } from 'vue';

import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { getWorkflows } from '@/app/api/workflows';
import { CORE_NODES_CATEGORY } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { buildOverview, useUiExtensionOverviewData } from './useUiExtensionOverviewData';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest: vi.fn(),
}));
vi.mock('@/app/api/workflows', () => ({ getWorkflows: vi.fn() }));

const SLACK = 'n8n-nodes-base.slack';
const SHEETS = 'n8n-nodes-base.googleSheets';
const IF = 'n8n-nodes-base.if';
const HTTP = 'n8n-nodes-base.httpRequest';

const NODE_TYPES: Record<string, INodeTypeDescription> = {
	[SLACK]: {
		...mockNodeTypeDescription({ name: SLACK, displayName: 'Slack' }),
		credentials: [{ name: 'slackApi', required: true }],
	},
	[SHEETS]: {
		...mockNodeTypeDescription({ name: SHEETS, displayName: 'Google Sheets' }),
		credentials: [{ name: 'googleApi', required: true }],
	},
	[IF]: mockNodeTypeDescription({ name: IF, displayName: 'If' }),
	// Takes credentials, but is one of n8n's core nodes.
	[HTTP]: {
		...mockNodeTypeDescription({ name: HTTP, displayName: 'HTTP Request' }),
		credentials: [{ name: 'httpBasicAuth', required: false }],
		codex: { categories: [CORE_NODES_CATEGORY] },
	},
};
const getNodeType = (type: string) => NODE_TYPES[type] ?? null;

const node = (type: string, credential?: string, extra: Partial<INode> = {}) =>
	createTestNode({
		name: `${type}-${credential ?? 'none'}`,
		type,
		...(credential && { credentials: { api: { id: credential, name: credential } } }),
		...extra,
	});

const workflow = (id: string, nodes: INode[], active = false) => ({
	id,
	name: `Workflow ${id}`,
	active,
	nodes,
});

const run = (id: string, workflowId: string, status: UiExtensionRun['status']): UiExtensionRun => ({
	id,
	workflowId,
	workflowName: `Workflow ${workflowId}`,
	status,
	mode: 'trigger',
	startedAt: '2026-11-16T11:00:00.000Z',
	stoppedAt: '2026-11-16T11:00:01.000Z',
});

describe(buildOverview, () => {
	it('groups the service nodes by type and leaves out core and logic nodes', () => {
		const result = buildOverview(
			[
				workflow('1', [node(SLACK, 'Sales Slack'), node(SLACK, 'Ops Slack'), node(IF)], true),
				workflow('2', [node(SLACK, 'Sales Slack'), node(SHEETS, 'Finance'), node(HTTP, 'Basic')]),
				workflow('3', [node(IF)]),
			],
			{ total: 3, active: 1 },
			[],
			getNodeType,
		);

		expect(
			result.services.map((s) => [s.nodeType, s.workflowCount, s.activeWorkflowCount]),
		).toEqual([
			[SLACK, 2, 1],
			[SHEETS, 1, 0],
		]);
		expect(result.services[0].displayName).toBe('Slack');
		expect(result.services[0].accounts).toEqual(['Sales Slack', 'Ops Slack']);
		expect(result.workflows).toEqual({ total: 3, active: 1, scanned: 3 });
	});

	it('skips disabled nodes and node types that are not installed', () => {
		const result = buildOverview(
			[workflow('1', [node(SLACK, 'A', { disabled: true }), node('community.unknown', 'B')])],
			{ total: 1, active: 0 },
			[],
			getNodeType,
		);

		expect(result.services).toEqual([]);
	});

	it('takes the health from the newest run of each workflow that uses the service', () => {
		const result = buildOverview(
			[
				workflow('ok', [node(SLACK)]),
				workflow('bad', [node(SHEETS)]),
				workflow('idle', [node('n8n-nodes-base.slack'), node(SHEETS)]),
				workflow('fixed', [node(SLACK)]),
			],
			{ total: 4, active: 0 },
			// Newest first: "fixed" failed before, but its newest run succeeded.
			[
				run('5', 'fixed', 'success'),
				run('4', 'bad', 'crashed'),
				run('3', 'ok', 'success'),
				run('2', 'fixed', 'error'),
			],
			getNodeType,
		);
		const health = Object.fromEntries(result.services.map((s) => [s.nodeType, s.health]));

		expect(health).toEqual({ [SLACK]: 'ok', [SHEETS]: 'failing' });
		expect(result.services.find((s) => s.nodeType === SLACK)?.workflows).toContainEqual({
			id: 'idle',
			name: 'Workflow idle',
			active: false,
			lastRun: null,
		});
		expect(result.runs).toEqual({ scanned: 4, succeeded: 2, failed: 2 });
		expect(result.failures.map((r) => r.id)).toEqual(['4', '2']);
	});

	it('is unknown when no workflow of the service ran', () => {
		const result = buildOverview(
			[workflow('1', [node(SLACK)])],
			{ total: 1, active: 0 },
			[run('9', 'other', 'error')],
			getNodeType,
		);

		expect(result.services[0].health).toBe('unknown');
	});

	it('keeps to the caps', () => {
		const manyTypes = Array.from({ length: 40 }, (_, i) => `n8n-nodes-base.service${i}`);
		const types: Record<string, INodeTypeDescription> = Object.fromEntries(
			manyTypes.map((type) => [type, { ...NODE_TYPES[SLACK], name: type, displayName: type }]),
		);
		const workflows = Array.from({ length: 8 }, (_, i) =>
			workflow(
				String(i),
				[
					// Slack is in every workflow, the other services in fewer, so Slack stays in the top.
					...(i < 2 ? manyTypes.map((type) => node(type)) : []),
					...Array.from({ length: 8 }, (__, j) => node(SLACK, `Account ${j}`)),
				],
				i % 2 === 0,
			),
		);
		const runs = Array.from({ length: 10 }, (_, i) => run(String(i), String(i % 8), 'error'));

		const result = buildOverview(workflows, { total: 8, active: 4 }, runs, (type) =>
			type === SLACK ? NODE_TYPES[SLACK] : (types[type] ?? null),
		);

		expect(result.services).toHaveLength(UI_EXTENSION_DATA_LIMITS.overviewServices);
		const slack = result.services.find((s) => s.nodeType === SLACK);
		expect(slack?.accounts).toHaveLength(UI_EXTENSION_DATA_LIMITS.overviewAccountsPerService);
		expect(slack?.workflows).toHaveLength(UI_EXTENSION_DATA_LIMITS.overviewWorkflowsPerService);
		// Active workflows come first.
		expect(slack?.workflows.slice(0, 4).every((w) => w.active)).toBe(true);
		expect(result.failures).toHaveLength(UI_EXTENSION_DATA_LIMITS.overviewFailures);
	});
});

describe(useUiExtensionOverviewData, () => {
	beforeEach(() => {
		createTestingPinia();
		const nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.getNodeType = vi.fn(getNodeType);
		vi.mocked(getWorkflows).mockReset();
		vi.mocked(makeRestApiRequest).mockReset();
	});

	function mockResponses() {
		vi.mocked(getWorkflows)
			.mockResolvedValueOnce({
				count: 250,
				data: [workflow('1', [node(SLACK, 'Sales Slack')], true)] as never,
			})
			.mockResolvedValueOnce({ count: 12, data: [] });
		vi.mocked(makeRestApiRequest).mockResolvedValue({
			results: [
				{
					id: '7',
					workflowId: '1',
					workflowName: 'Workflow 1',
					status: 'error',
					mode: 'trigger',
					startedAt: '2026-11-16T11:00:00.000Z',
					stoppedAt: '2026-11-16T11:00:01.000Z',
				},
			],
		});
	}

	function setup(enabled: boolean) {
		const isEnabled = ref(enabled);
		const scope = effectScope();
		const result = scope.run(() => useUiExtensionOverviewData(isEnabled))!;
		return { ...result, isEnabled, scope };
	}

	it('fetches nothing while it is disabled', async () => {
		const { data } = setup(false);
		await flushPromises();

		expect(getWorkflows).not.toHaveBeenCalled();
		expect(makeRestApiRequest).not.toHaveBeenCalled();
		expect(data.value.state).toBe('loading');
	});

	it('fetches the newest workflows, the active count and the newest runs once enabled', async () => {
		mockResponses();
		const { data, isEnabled } = setup(false);

		isEnabled.value = true;
		await flushPromises();

		expect(useNodeTypesStore().loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(getWorkflows).toHaveBeenCalledWith(
			expect.anything(),
			{ isArchived: false },
			{ take: 200, sortBy: 'updatedAt:desc', includeScopes: false },
			['id', 'name', 'active', 'nodes'],
		);
		expect(getWorkflows).toHaveBeenCalledWith(
			expect.anything(),
			{ isArchived: false, active: true },
			{ take: 1, includeScopes: false },
			['id'],
		);
		expect(makeRestApiRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/executions', {
			filter: {},
			limit: 50,
		});
		expect(data.value).toMatchObject({
			state: 'ready',
			overview: {
				workflows: { total: 250, active: 12, scanned: 1 },
				runs: { scanned: 1, succeeded: 0, failed: 1 },
				services: [{ nodeType: SLACK, health: 'failing', accounts: ['Sales Slack'] }],
				failures: [{ id: '7', workflowId: '1' }],
			},
		});
	});

	it('gives the error state when a call fails', async () => {
		vi.mocked(getWorkflows).mockRejectedValue(new Error('offline'));
		vi.mocked(makeRestApiRequest).mockResolvedValue({ results: [] });
		const { data } = setup(true);
		await flushPromises();

		expect(data.value).toEqual({ state: 'error', runs: null, services: null });
	});

	it('merges overlapping refreshes into one more fetch', async () => {
		vi.mocked(getWorkflows).mockResolvedValue({ count: 0, data: [] });
		vi.mocked(makeRestApiRequest).mockResolvedValue({ results: [] });
		const { refresh } = setup(true);

		refresh();
		refresh();
		refresh();
		await flushPromises();

		// One fetch on enable and one merged fetch after it, two workflow calls each.
		expect(getWorkflows).toHaveBeenCalledTimes(4);
	});
});
