import { effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { getWorkflow, getWorkflows } from '@/app/api/workflows';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { IWorkflowDb } from '@/Interface';

import { buildDraftMention } from './buildMentionAttachment';
import type { InstanceAiDraftMention } from './instanceAiMentions.types';
import { useInstanceAiMentionCatalog } from './useInstanceAiMentionCatalog';

vi.mock('@/app/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
}));

const mockGetWorkflows = vi.mocked(getWorkflows);
const mockGetWorkflow = vi.mocked(getWorkflow);

function workflow(id = 'workflow-1', overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return createTestWorkflow({
		id,
		name: `Workflow ${id}`,
		versionId: `version-${id}`,
		isArchived: false,
		updatedAt: '2026-09-18T00:00:00.000Z',
		nodes: [createTestNode({ id: `node-${id}`, name: `Node ${id}` })],
		nodeGroups: [],
		...overrides,
	});
}

function setup(
	overrides: {
		enabled?: boolean;
		projectId?: string;
		isOpen?: boolean;
		durableWorkflowIds?: Set<string>;
		draftMentions?: InstanceAiDraftMention[];
	} = {},
) {
	const enabled = ref(overrides.enabled ?? true);
	const projectId = ref<string | undefined>(overrides.projectId ?? 'project-1');
	const isOpen = ref(overrides.isOpen ?? true);
	const query = ref('');
	const durableWorkflowIds = ref<ReadonlySet<string>>(overrides.durableWorkflowIds ?? new Set());
	const draftMentions = ref(overrides.draftMentions ?? []);
	const buildingWorkflowIds = ref<ReadonlySet<string>>(new Set());
	const scope = effectScope();
	const catalog = scope.run(() =>
		useInstanceAiMentionCatalog({
			enabled,
			projectId,
			isOpen,
			query,
			durableWorkflowIds,
			draftMentions,
			buildingWorkflowIds,
		}),
	);
	if (!catalog) throw new Error('Catalog scope did not start');
	return {
		catalog,
		scope,
		enabled,
		projectId,
		isOpen,
		query,
		durableWorkflowIds,
		draftMentions,
		buildingWorkflowIds,
	};
}

describe('useInstanceAiMentionCatalog', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.clearAllMocks();
		mockGetWorkflows.mockResolvedValue({ count: 1, data: [workflow()] });
		mockGetWorkflow.mockResolvedValue(workflow());
	});

	it('makes no workflow request while the mentions flag is off', async () => {
		setup({ enabled: false, durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();

		expect(mockGetWorkflows).not.toHaveBeenCalled();
		expect(mockGetWorkflow).not.toHaveBeenCalled();
	});

	it('scopes bounded workflow requests to the current project and excludes archived workflows', async () => {
		setup();
		await flushPromises();

		expect(mockGetWorkflows).toHaveBeenCalledWith(
			expect.anything(),
			{ projectId: 'project-1', isArchived: false },
			{ skip: 0, take: 1, sortBy: 'updatedAt:desc' },
			['id', 'updatedAt'],
		);
		expect(mockGetWorkflows).toHaveBeenCalledWith(
			expect.anything(),
			{ projectId: 'project-1', isArchived: false },
			{ skip: 0, take: 10, sortBy: 'updatedAt:desc' },
			['id', 'name', 'versionId', 'isArchived', 'updatedAt'],
		);
	});

	it('does not load workflow details until the workflow has an open Assistant tab', async () => {
		setup();
		await flushPromises();

		expect(mockGetWorkflow).not.toHaveBeenCalled();
	});

	it('limits workflow metadata to 10 results', async () => {
		const workflows = Array.from({ length: 12 }, (_, index) => workflow(`workflow-${index}`));
		mockGetWorkflows.mockImplementation(async (_context, _filter, request) => {
			const pagination = request as { take?: number; skip?: number } | undefined;
			return pagination?.take === 1
				? { count: workflows.length, data: [workflows[0]] }
				: { count: workflows.length, data: workflows };
		});
		const { catalog } = setup();
		await flushPromises();

		expect(catalog.workflowCandidates.value).toHaveLength(10);
		expect(catalog.workflowCandidates.value.at(-1)?.workflowId).toBe('workflow-9');
	});

	it('uses a hydrated workflow document before an API fallback', async () => {
		useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1')).hydrate(
			workflow('workflow-1', {
				name: 'Live workflow',
				nodes: [createTestNode({ id: 'live-node', name: 'Live node' })],
			}),
		);
		const { catalog } = setup({ durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();

		expect(mockGetWorkflow).not.toHaveBeenCalled();
		expect(catalog.localCandidates.value).toEqual([
			expect.objectContaining({ label: 'Live node', workflowId: 'workflow-1' }),
		]);
	});

	it('fetches full bodies only for eligible artifact workflows and deduplicates reads', async () => {
		const { catalog, durableWorkflowIds } = setup({
			durableWorkflowIds: new Set(['workflow-1']),
		});
		await flushPromises();
		durableWorkflowIds.value = new Set(['workflow-1']);
		await flushPromises();

		expect(mockGetWorkflow).toHaveBeenCalledTimes(1);
		expect(mockGetWorkflow).toHaveBeenCalledWith(expect.anything(), 'workflow-1');
		expect(catalog.loadedWorkflowIds.value.has('workflow-1')).toBe(true);
	});

	it('reports a workflow detail error and retries it', async () => {
		mockGetWorkflow.mockRejectedValueOnce(new Error('offline'));
		const { catalog } = setup({ durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();
		expect(catalog.projectionErrorIds.value.has('workflow-1')).toBe(true);

		mockGetWorkflow.mockResolvedValue(workflow());
		catalog.retryWorkflowDetails('workflow-1');
		await flushPromises();

		expect(mockGetWorkflow).toHaveBeenCalledTimes(2);
		expect(catalog.projectionErrorIds.value.has('workflow-1')).toBe(false);
		expect(catalog.loadedWorkflowIds.value.has('workflow-1')).toBe(true);
	});

	it('limits workflow detail reads to two concurrent requests', async () => {
		const reads = [
			Promise.withResolvers<IWorkflowDb>(),
			Promise.withResolvers<IWorkflowDb>(),
			Promise.withResolvers<IWorkflowDb>(),
		];
		mockGetWorkflow.mockImplementation((_context, id) => reads[Number(id.at(-1)) - 1].promise);
		setup({ durableWorkflowIds: new Set(['workflow-1', 'workflow-2', 'workflow-3']) });
		await flushPromises();

		expect(mockGetWorkflow).toHaveBeenCalledTimes(2);
		reads[0].resolve(workflow('workflow-1'));
		await flushPromises();
		expect(mockGetWorkflow).toHaveBeenCalledTimes(3);
		reads[1].resolve(workflow('workflow-2'));
		reads[2].resolve(workflow('workflow-3'));
	});

	it('includes draft workflow artifacts and marks ambiguous children unavailable', async () => {
		const duplicateNode = createTestNode({ id: 'duplicate', name: 'Duplicate node' });
		mockGetWorkflow.mockResolvedValue(
			workflow('workflow-1', {
				nodes: [duplicateNode, { ...duplicateNode, name: 'Other duplicate' }],
				nodeGroups: [{ id: 'group-1', name: 'Broken group', nodeIds: ['missing'] }],
			}),
		);
		const draft = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Workflow 1' },
			'typed',
		);
		const { catalog } = setup({ draftMentions: [draft] });
		await flushPromises();

		expect(mockGetWorkflow).toHaveBeenCalledWith(expect.anything(), 'workflow-1');
		expect(catalog.localCandidates.value).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: 'Duplicate node', unavailableReason: 'node-unavailable' }),
				expect.objectContaining({ label: 'Broken group', unavailableReason: 'group-unavailable' }),
			]),
		);
	});

	it('marks a node with a missing runtime ID unavailable instead of throwing', async () => {
		const missingIdNode = { ...createTestNode({ name: 'Legacy node' }), id: undefined } as never;
		mockGetWorkflow.mockResolvedValue(
			workflow('workflow-1', {
				nodes: [missingIdNode],
			}),
		);
		const { catalog } = setup({ durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();

		expect(catalog.localCandidates.value).toEqual([
			expect.objectContaining({
				label: 'Legacy node',
				unavailableReason: 'node-unavailable',
			}),
		]);
	});

	it('recovers an availability error through retry', async () => {
		mockGetWorkflows.mockRejectedValueOnce(new Error('offline'));
		const { catalog } = setup({ isOpen: false });
		await flushPromises();
		expect(catalog.availability.value).toBe('error');

		mockGetWorkflows.mockResolvedValue({ count: 1, data: [workflow()] });
		await catalog.retry();

		expect(catalog.availability.value).toBe('available');
	});

	it('searches local children immediately while remote workflow search is debounced', async () => {
		const { catalog, query } = setup({ durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();
		mockGetWorkflows.mockClear();

		query.value = 'Node workflow-1';
		await flushPromises();

		expect(catalog.visibleCandidates.value).toEqual([
			expect.objectContaining({ kind: 'node', label: 'Node workflow-1' }),
		]);
		expect(mockGetWorkflows).not.toHaveBeenCalled();
	});

	it('does not apply a detail response after the catalog scope is disposed', async () => {
		const read = Promise.withResolvers<IWorkflowDb>();
		mockGetWorkflow.mockReturnValue(read.promise);
		const { catalog, scope } = setup({ durableWorkflowIds: new Set(['workflow-1']) });
		await flushPromises();
		scope.stop();

		read.resolve(workflow('workflow-1'));
		await flushPromises();

		expect(catalog.localCandidates.value).toEqual([]);
	});
});
