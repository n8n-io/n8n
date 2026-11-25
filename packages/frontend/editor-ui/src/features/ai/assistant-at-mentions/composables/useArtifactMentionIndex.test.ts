import type { IWorkflowDb } from '@/Interface';
import { effectScope, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { WorkflowArtifactProjectionSource } from './useArtifactMentionIndex';
import { projectWorkflowArtifact, useArtifactMentionIndex } from './useArtifactMentionIndex';

function makeWorkflow(id: string, overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return {
		id,
		name: `Workflow ${id}`,
		active: false,
		isArchived: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		nodes: [
			{
				id: `node-${id}`,
				name: `Node ${id}`,
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: { secret: 'discard me' },
			},
		],
		connections: {},
		versionId: `version-${id}`,
		activeVersionId: null,
		...overrides,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

function setupIndex(options: Parameters<typeof useArtifactMentionIndex>[0]) {
	const scope = effectScope();
	let index!: ReturnType<typeof useArtifactMentionIndex>;
	scope.run(() => {
		index = useArtifactMentionIndex(options);
	});
	return { index, scope };
}

describe('projectWorkflowArtifact', () => {
	it('keeps only compact node and valid group membership fields', () => {
		const workflow = makeWorkflow('1', {
			nodeGroups: [
				{
					id: 'group-1',
					name: 'Group 1',
					nodeIds: ['node-1', 'missing', 'node-1'],
					description: 'discard me',
				},
			],
		});

		const index = projectWorkflowArtifact(workflow);

		expect(index.nodes).toEqual([
			{
				id: 'node-1',
				name: 'Node 1',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
			},
		]);
		expect(index.groups).toEqual([{ id: 'group-1', name: 'Group 1', nodeIds: ['node-1'] }]);
		expect(index.nodeIdToGroupId.get('node-1')).toBe('group-1');
	});

	it('leaves out sticky notes and groups that held nothing else', () => {
		const sticky = (id: string) => ({
			id,
			name: id,
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		});
		const workflow = makeWorkflow('1', {
			nodes: [...makeWorkflow('1').nodes, sticky('note-1'), sticky('note-2')],
			nodeGroups: [
				{ id: 'group-1', name: 'Mixed', nodeIds: ['node-1', 'note-1'] },
				{ id: 'group-2', name: 'Notes only', nodeIds: ['note-2'] },
			],
		});

		const index = projectWorkflowArtifact(workflow);

		expect(index.nodes.map((node) => node.id)).toEqual(['node-1']);
		expect(index.groups).toEqual([{ id: 'group-1', name: 'Mixed', nodeIds: ['node-1'] }]);
		expect(index.groupsById.has('group-2')).toBe(false);
	});
});

describe('useArtifactMentionIndex', () => {
	it('loads inactive artifacts lazily with at most two concurrent requests', async () => {
		const responses = new Map(['1', '2', '3'].map((id) => [id, deferred<IWorkflowDb>()] as const));
		let inFlight = 0;
		let maxInFlight = 0;
		const fetchWorkflow = vi.fn(async (workflowId: string) => {
			inFlight++;
			maxInFlight = Math.max(maxInFlight, inFlight);
			const workflow = await responses.get(workflowId)!.promise;
			inFlight--;
			return workflow;
		});
		const { index, scope } = setupIndex({
			artifacts: ['1', '2', '3'].map((id) => ({ id, name: `Workflow ${id}` })),
			fetchWorkflow,
			getActiveWorkflow: () => undefined,
		});

		const loading = index.loadAll();
		expect(fetchWorkflow).toHaveBeenCalledTimes(2);

		responses.get('1')!.resolve(makeWorkflow('1'));
		await vi.waitFor(() => expect(fetchWorkflow).toHaveBeenCalledTimes(3));
		responses.get('2')!.resolve(makeWorkflow('2'));
		responses.get('3')!.resolve(makeWorkflow('3'));
		await loading;

		expect(maxInFlight).toBe(2);
		expect(index.getEntry('3')?.status).toBe('ready');
		scope.stop();
	});

	it('lets an active document override a pending fetched response', async () => {
		const response = deferred<IWorkflowDb>();
		const activeWorkflowId = ref<string>();
		const activeWorkflow = ref<WorkflowArtifactProjectionSource>();
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Saved workflow' }],
			activeWorkflowId,
			fetchWorkflow: async () => await response.promise,
			getActiveWorkflow: (workflowId) =>
				activeWorkflow.value?.id === workflowId ? activeWorkflow.value : undefined,
		});

		const pending = index.load('1');
		activeWorkflow.value = {
			id: '1',
			name: 'Unsaved workflow',
			versionId: 'active-version',
			nodes: [],
		};
		activeWorkflowId.value = '1';
		await nextTick();

		expect(index.getIndex('1')?.workflowName).toBe('Unsaved workflow');
		expect(index.getEntry('1')?.source).toBe('active');

		response.resolve(makeWorkflow('1'));
		await pending;
		expect(index.getIndex('1')?.workflowName).toBe('Unsaved workflow');
		scope.stop();
	});

	it('reacts to active workflow hierarchy changes', async () => {
		const activeWorkflowId = ref('1');
		const activeWorkflow = ref<WorkflowArtifactProjectionSource>({
			id: '1',
			name: 'Workflow 1',
			versionId: 'version-1',
			nodes: [],
		});
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Workflow 1' }],
			activeWorkflowId,
			fetchWorkflow: async () => makeWorkflow('1'),
			getActiveWorkflow: () => activeWorkflow.value,
		});

		activeWorkflow.value = {
			...activeWorkflow.value,
			nodes: [
				{
					id: 'new-node',
					name: 'New node',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
				},
			],
		};
		await nextTick();

		expect(index.getIndex('1')?.nodesById.has('new-node')).toBe(true);
		scope.stop();
	});

	it('updates a fetched index when its artifact is renamed', async () => {
		const artifacts = ref([{ id: '1', name: 'Original workflow' }]);
		const { index, scope } = setupIndex({
			artifacts,
			fetchWorkflow: async () => makeWorkflow('1', { name: 'Original workflow' }),
			getActiveWorkflow: () => undefined,
		});
		await index.load('1');

		artifacts.value = [{ id: '1', name: 'Renamed workflow' }];
		await nextTick();

		expect(index.getIndex('1')?.workflowName).toBe('Renamed workflow');
		scope.stop();
	});

	it('keeps an artifact rename that happens while its fetch is in flight', async () => {
		const response = deferred<IWorkflowDb>();
		const artifacts = ref([{ id: '1', name: 'Original workflow' }]);
		const { index, scope } = setupIndex({
			artifacts,
			fetchWorkflow: async () => await response.promise,
			getActiveWorkflow: () => undefined,
		});

		const pending = index.load('1');
		artifacts.value = [{ id: '1', name: 'Renamed workflow' }];
		await nextTick();
		response.resolve(makeWorkflow('1', { name: 'Original workflow' }));
		await pending;

		expect(index.getEntry('1')).toMatchObject({ status: 'ready', source: 'fetched' });
		expect(index.getIndex('1')?.workflowName).toBe('Renamed workflow');
		scope.stop();
	});

	it('ignores an invalidated response and allows a fresh retry', async () => {
		const stale = deferred<IWorkflowDb>();
		const fetchWorkflow = vi
			.fn<(workflowId: string) => Promise<IWorkflowDb>>()
			.mockReturnValueOnce(stale.promise)
			.mockResolvedValueOnce(makeWorkflow('1', { versionId: 'fresh-version' }));
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Workflow 1' }],
			fetchWorkflow,
			getActiveWorkflow: () => undefined,
		});

		const pending = index.load('1');
		index.invalidate('1');
		stale.resolve(makeWorkflow('1', { versionId: 'stale-version' }));
		await pending;

		expect(index.getEntry('1')?.status).toBe('idle');
		expect(index.getIndex('1')).toBeUndefined();
		await index.load('1');
		expect(index.getIndex('1')?.versionId).toBe('fresh-version');
		scope.stop();
	});

	it('keeps a ready compact index visible during a forced reload', async () => {
		const refreshed = deferred<IWorkflowDb>();
		const fetchWorkflow = vi
			.fn<(workflowId: string) => Promise<IWorkflowDb>>()
			.mockResolvedValueOnce(makeWorkflow('1', { versionId: 'current-version' }))
			.mockReturnValueOnce(refreshed.promise);
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Workflow 1' }],
			fetchWorkflow,
			getActiveWorkflow: () => undefined,
		});

		await index.load('1');
		const reloading = index.load('1', { force: true });

		expect(index.getEntry('1')).toMatchObject({
			status: 'loading',
			index: { versionId: 'current-version' },
		});

		refreshed.resolve(makeWorkflow('1', { versionId: 'refreshed-version' }));
		await reloading;
		expect(index.getIndex('1')?.versionId).toBe('refreshed-version');
		scope.stop();
	});

	it('keeps an error until an explicit forced retry', async () => {
		const fetchWorkflow = vi
			.fn<(workflowId: string) => Promise<IWorkflowDb>>()
			.mockRejectedValueOnce(new Error('Unavailable'))
			.mockResolvedValueOnce(makeWorkflow('1'));
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Workflow 1' }],
			fetchWorkflow,
			getActiveWorkflow: () => undefined,
		});

		await index.load('1');
		await index.load('1');
		expect(fetchWorkflow).toHaveBeenCalledTimes(1);

		await index.retry('1');
		expect(fetchWorkflow).toHaveBeenCalledTimes(2);
		expect(index.getEntry('1')?.status).toBe('ready');
		scope.stop();
	});

	it('starts with the active artifact when inactive reads are queued', async () => {
		const responses = new Map(['1', '2', '3'].map((id) => [id, deferred<IWorkflowDb>()] as const));
		const fetchWorkflow = vi.fn(
			async (workflowId: string) => await responses.get(workflowId)!.promise,
		);
		const { index, scope } = setupIndex({
			artifacts: ['1', '2', '3'].map((id) => ({ id, name: `Workflow ${id}` })),
			activeWorkflowId: '2',
			fetchWorkflow,
			getActiveWorkflow: () => undefined,
		});

		const loading = index.loadAll();
		expect(fetchWorkflow).toHaveBeenNthCalledWith(1, '2');

		responses.get('2')!.resolve(makeWorkflow('2'));
		responses.get('1')!.resolve(makeWorkflow('1'));
		await vi.waitFor(() => expect(fetchWorkflow).toHaveBeenCalledWith('3'));
		responses.get('3')!.resolve(makeWorkflow('3'));
		await loading;
		scope.stop();
	});

	it('removes cached and pending data when an artifact leaves the thread', async () => {
		const response = deferred<IWorkflowDb>();
		const artifacts = ref([{ id: '1', name: 'Workflow 1' }]);
		const { index, scope } = setupIndex({
			artifacts,
			fetchWorkflow: async () => await response.promise,
			getActiveWorkflow: () => undefined,
		});

		const pending = index.load('1');
		artifacts.value = [];
		await nextTick();
		response.resolve(makeWorkflow('1'));
		await pending;

		expect(index.getEntry('1')).toBeUndefined();
		scope.stop();
	});

	it('clears its compact cache and ignores late responses on scope disposal', async () => {
		const response = deferred<IWorkflowDb>();
		const { index, scope } = setupIndex({
			artifacts: [{ id: '1', name: 'Workflow 1' }],
			fetchWorkflow: async () => await response.promise,
			getActiveWorkflow: () => undefined,
		});

		const pending = index.load('1');
		scope.stop();
		expect(index.entries.size).toBe(0);

		response.resolve(makeWorkflow('1'));
		await pending;
		expect(index.entries.size).toBe(0);
	});
});
