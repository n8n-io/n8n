/**
 * Integration tests for workflowDocument.store cross-cut wiring.
 *
 * These tests verify the orchestration logic in workflowDocument.store.ts —
 * the glue that connects composables to each other and to external stores.
 * Individual composable behavior is tested in their own test files.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections } from 'n8n-workflow';
import type { ITag, WorkflowHistory } from '@n8n/rest-api-client';
import type { Scope } from '@n8n/permissions';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import type { IUsedCredential } from '@/features/credentials/credentials.types';

const { getNodeTypeMock } = vi.hoisted(() => ({
	getNodeTypeMock: vi.fn().mockReturnValue(null),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: getNodeTypeMock,
		communityNodeType: vi.fn().mockReturnValue(null),
	})),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

describe('workflowDocument.store orchestration', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getNodeTypeMock.mockReturnValue(null);
	});

	it('removeAllNodes clears nodes, connections, and pin data', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

		// Set up nodes, connections, and pin data
		workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
		workflowDocumentStore.setConnections({
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
		workflowDocumentStore.setPinData({ A: [{ json: { value: 1 } }] });

		// Verify all are populated
		expect(workflowDocumentStore.allNodes).toHaveLength(2);
		expect(workflowDocumentStore.connectionsBySourceNode).toHaveProperty('A');
		expect(workflowDocumentStore.pinData).toHaveProperty('A');

		// removeAllNodes should clear all three
		workflowDocumentStore.removeAllNodes();

		expect(workflowDocumentStore.allNodes).toHaveLength(0);
		expect(workflowDocumentStore.connectionsBySourceNode).toEqual({});
		expect(workflowDocumentStore.pinData).toEqual({});
	});

	it('disposeWorkflowDocumentStore disposes the instance and clears scoped state', () => {
		const workflowDocumentId = createWorkflowDocumentId('test-wf');
		const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
		const pinia = getActivePinia();
		const disposeSpy = vi.spyOn(workflowDocumentStore, '$dispose');

		workflowDocumentStore.setName('Stale workflow name');

		expect(pinia?.state.value[workflowDocumentStore.$id]).toBeDefined();

		disposeWorkflowDocumentStore(workflowDocumentStore);

		expect(disposeSpy).toHaveBeenCalledOnce();
		expect(pinia?.state.value[workflowDocumentStore.$id]).toBeUndefined();

		const recreatedWorkflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);

		expect(recreatedWorkflowDocumentStore).not.toBe(workflowDocumentStore);
		expect(recreatedWorkflowDocumentStore.name).toBe('');
	});

	it('node mutation triggers markStateDirty on UI store', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addNode fires onStateDirty, which the store wires to markStateDirty
		workflowDocumentStore.addNode(createNode({ name: 'A' }));

		expect(uiStore.stateIsDirty).toBe(true);
	});

	it('connection mutation triggers markStateDirty on UI store', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addConnection fires onStateDirty, which the store wires to markStateDirty
		workflowDocumentStore.addConnection({
			connection: [
				{ node: 'A', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
			],
		});

		expect(uiStore.stateIsDirty).toBe(true);
	});

	describe('nodeValidationIssues', () => {
		it('collects issues only from connected, enabled nodes', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			const connections: IConnections = {
				Start: {
					main: [[{ node: 'Fetch', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			workflowDocumentStore.setNodes([
				createNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }),
				createNode({
					name: 'Fetch',
					type: 'n8n-nodes-base.httpRequest',
					issues: {
						parameters: {
							url: ['Missing URL', 'Invalid URL.'],
						},
						credentials: {
							httpBasicAuth: ['Credentials not set'],
						},
					},
				}),
				createNode({
					name: 'Disconnected',
					type: 'n8n-nodes-base.set',
					issues: {
						parameters: { field: ['Should be ignored'] },
					},
				}),
				createNode({
					name: 'Disabled Node',
					type: 'n8n-nodes-base.set',
					disabled: true,
					issues: {
						parameters: { field: ['Disabled issue'] },
					},
				}),
			]);
			workflowDocumentStore.setConnections(connections);

			const issues = workflowDocumentStore.nodeValidationIssues;
			expect(issues).toEqual([
				{ node: 'Fetch', type: 'parameters', value: ['Missing URL', 'Invalid URL.'] },
				{ node: 'Fetch', type: 'credentials', value: ['Credentials not set'] },
			]);
		});
	});

	describe('formatNodeIssueMessage', () => {
		it('joins array entries and trims trailing period', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			const message = workflowDocumentStore.formatNodeIssueMessage([
				'Missing URL',
				'Invalid value.',
			]);
			expect(message).toBe('Missing URL, Invalid value');
		});

		it('returns string representation for non-array values', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			expect(workflowDocumentStore.formatNodeIssueMessage('Simple issue.')).toBe('Simple issue.');
		});
	});

	describe('hasNodeValidationIssues', () => {
		it('should return true when a node has issues and connected', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			workflowDocumentStore.setNodes([
				createNode({ name: 'Node1', issues: { parameters: { field: ['Error message'] } } }),
				createNode({ name: 'Node2' }),
			]);

			workflowDocumentStore.setConnections({
				Node1: { main: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const hasIssues = workflowDocumentStore.hasNodeValidationIssues;
			expect(hasIssues).toBe(true);
		});

		it('should return false when node has issues but it is not connected', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			workflowDocumentStore.setNodes([
				createNode({ name: 'Node1', issues: { parameters: { field: ['Error message'] } } }),
				createNode({ name: 'Node2' }),
			]);

			const hasIssues = workflowDocumentStore.hasNodeValidationIssues;
			expect(hasIssues).toBe(false);
		});

		it('should return false when no nodes have issues', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			workflowDocumentStore.setNodes([
				createNode({ name: 'Node1' }),
				createNode({ name: 'Node2' }),
			]);
			workflowDocumentStore.setConnections({
				Node1: { main: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const hasIssues = workflowDocumentStore.hasNodeValidationIssues;
			expect(hasIssues).toBe(false);
		});

		it('should return false when there are no nodes', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

			workflowDocumentStore.setNodes([]);

			const hasIssues = workflowDocumentStore.hasNodeValidationIssues;
			expect(hasIssues).toBe(false);
		});
	});

	describe('serialize', () => {
		it('assembles every doc field into WorkflowData', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-42'));

			workflowDocumentStore.setName('My Workflow');
			workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});
			workflowDocumentStore.setPinData({ A: [{ json: { value: 1 } }] });
			workflowDocumentStore.setTags(['tag-1', 'tag-2']);

			const data = workflowDocumentStore.serialize();

			expect(data.name).toBe('My Workflow');
			expect(data.nodes).toHaveLength(2);
			expect(data.connections).toHaveProperty('A');
			expect(data.pinData).toHaveProperty('A');
			expect(data.tags).toEqual(['tag-1', 'tag-2']);
			expect(data.id).toBe('wf-42');
		});

		it('deep-copies connections so later store mutations do not affect saved data', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));

			workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const data = workflowDocumentStore.serialize();

			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(data.connections).not.toHaveProperty('C');
		});
	});

	describe('hydrate', () => {
		function buildFullWorkflow(): IWorkflowDb {
			const version: WorkflowHistory = {
				versionId: 'ver-123',
				authors: 'Alice',
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
				workflowPublishHistory: [],
				name: 'v1',
				description: 'first',
			};

			const homeProject = { id: 'p-home' } as ProjectSharingData;
			const sharedProject = { id: 'p-1' } as ProjectSharingData;
			const usedCredential: IUsedCredential = {
				id: 'c-1',
				name: 'Cred',
				credentialType: 'httpBasicAuth',
				currentUserHasAccess: true,
			};

			return {
				id: 'wf-1',
				name: 'My Workflow',
				description: 'Sample description',
				active: true,
				isArchived: false,
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-02T00:00:00.000Z',
				nodes: [createNode({ name: 'A' }), createNode({ name: 'B' })],
				connections: {
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
				settings: { executionOrder: 'v1', timezone: 'UTC' },
				tags: ['tag-1', 'tag-2'],
				pinData: { A: [{ json: { foo: 'bar' } }] },
				sharedWithProjects: [sharedProject],
				homeProject,
				scopes: ['workflow:read', 'workflow:update'] as Scope[],
				versionId: 'ver-123',
				activeVersionId: 'ver-123',
				usedCredentials: [usedCredential],
				meta: { templateId: 'tpl-1' },
				parentFolder: { id: 'f-1', name: 'Folder', parentFolderId: null },
				activeVersion: version,
				checksum: 'abc123',
			};
		}

		it('populates every document-scoped field from a full IWorkflowDb', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
			const workflow = buildFullWorkflow();

			store.hydrate(workflow);

			expect(store.name).toBe('My Workflow');
			expect(store.description).toBe('Sample description');
			expect(store.activeVersionId).toBe('ver-123');
			expect(store.activeVersion).toEqual(workflow.activeVersion);
			expect(store.active).toBe(true);
			expect(store.isArchived).toBe(false);
			expect(store.homeProject).toEqual(workflow.homeProject);
			expect(store.sharedWithProjects).toEqual(workflow.sharedWithProjects);
			expect(store.scopes).toEqual(workflow.scopes);
			expect(store.tags).toEqual(['tag-1', 'tag-2']);
			expect(store.meta).toEqual({ templateId: 'tpl-1' });
			expect(store.settings).toEqual({ ...DEFAULT_SETTINGS, ...workflow.settings });
			expect(store.parentFolder).toEqual(workflow.parentFolder);
			expect(store.usedCredentials).toEqual({ 'c-1': workflow.usedCredentials?.[0] });
			expect(store.createdAt).toBe('2026-04-01T00:00:00.000Z');
			expect(store.updatedAt).toBe('2026-04-02T00:00:00.000Z');
			expect(store.checksum).toBe('abc123');
			expect(store.versionId).toBe('ver-123');
			expect(store.versionData).toEqual({
				versionId: 'ver-123',
				name: 'My Workflow',
				description: 'Sample description',
			});
			expect(store.allNodes).toHaveLength(2);
			expect(store.connectionsBySourceNode).toHaveProperty('A');
			expect(store.pinData).toEqual({ A: [{ json: { foo: 'bar' } }] });
		});

		it('applies safe defaults for missing optional fields', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-partial'));

			const minimal: IWorkflowDb = {
				id: 'wf-partial',
				name: 'Minimal',
				active: false,
				isArchived: false,
				createdAt: -1,
				updatedAt: -1,
				nodes: [],
				connections: {},
				versionId: '',
				activeVersionId: null,
			};

			store.hydrate(minimal);

			expect(store.name).toBe('Minimal');
			expect(store.description).toBe('');
			expect(store.activeVersionId).toBeNull();
			expect(store.activeVersion).toBeNull();
			expect(store.homeProject).toBeNull();
			expect(store.sharedWithProjects).toEqual([]);
			expect(store.scopes).toEqual([]);
			expect(store.tags).toEqual([]);
			expect(store.meta).toEqual({});
			expect(store.settings).toEqual({ ...DEFAULT_SETTINGS });
			expect(store.parentFolder).toBeNull();
			expect(store.usedCredentials).toEqual({});
			expect(store.checksum).toBe('');
			expect(store.versionData).toEqual({
				versionId: '',
				name: 'Minimal',
				description: null,
			});
			expect(store.allNodes).toHaveLength(0);
			expect(store.connectionsBySourceNode).toEqual({});
			expect(store.pinData).toEqual({});
		});

		it('normalizes ITag[] tags to string[]', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-tag'));
			const itags: ITag[] = [
				{ id: 't-1', name: 'alpha' },
				{ id: 't-2', name: 'beta' },
			];

			store.hydrate({
				id: 'wf-tag',
				name: 'WithTags',
				active: false,
				isArchived: false,
				createdAt: -1,
				updatedAt: -1,
				nodes: [],
				connections: {},
				versionId: '',
				activeVersionId: null,
				tags: itags,
			});

			expect(store.tags).toEqual(['t-1', 't-2']);
		});

		it('is idempotent — hydrating twice with the same input yields the same state', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
			const workflow = buildFullWorkflow();

			store.hydrate(workflow);
			const firstSnapshot = {
				name: store.name,
				description: store.description,
				activeVersionId: store.activeVersionId,
				isArchived: store.isArchived,
				tags: [...store.tags],
				checksum: store.checksum,
				allNodes: store.allNodes.map((n) => n.name),
				pinData: { ...store.pinData },
			};

			store.hydrate(workflow);

			expect(store.name).toBe(firstSnapshot.name);
			expect(store.description).toBe(firstSnapshot.description);
			expect(store.activeVersionId).toBe(firstSnapshot.activeVersionId);
			expect(store.isArchived).toBe(firstSnapshot.isArchived);
			expect([...store.tags]).toEqual(firstSnapshot.tags);
			expect(store.checksum).toBe(firstSnapshot.checksum);
			expect(store.allNodes.map((n) => n.name)).toEqual(firstSnapshot.allNodes);
			expect({ ...store.pinData }).toEqual(firstSnapshot.pinData);
		});

		describe('identity guards', () => {
			it('throws when workflow.id does not match the store workflow id', () => {
				const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
				const workflow = { ...buildFullWorkflow(), id: 'wf-other' };

				expect(() => store.hydrate(workflow)).toThrow(/workflow id mismatch/);
			});

			it('throws when workflow.versionId does not match an explicit store version', () => {
				const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1', 'ver-123'));
				const workflow = { ...buildFullWorkflow(), versionId: 'ver-999' };

				expect(() => store.hydrate(workflow)).toThrow(/workflow version mismatch/);
			});

			it("does not validate versionId when store version is 'latest'", () => {
				const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
				const workflow = { ...buildFullWorkflow(), versionId: 'ver-anything' };

				expect(() => store.hydrate(workflow)).not.toThrow();
				expect(store.versionId).toBe('ver-anything');
			});

			it('hydrates normally when both id and versionId match', () => {
				const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1', 'ver-123'));
				const workflow = buildFullWorkflow();

				expect(() => store.hydrate(workflow)).not.toThrow();
				expect(store.name).toBe('My Workflow');
				expect(store.versionId).toBe('ver-123');
			});
		});
	});

	describe('workflowObject sync', () => {
		it('setNodes syncs nodes to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			expect(store.getNodeByNameFromWorkflow('A')).toBeNull();

			store.setNodes([createNode({ name: 'A' })]);

			expect(store.getNodeByNameFromWorkflow('A')).toEqual(expect.objectContaining({ name: 'A' }));
		});

		it('addNode syncs to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			expect(store.getNodeByNameFromWorkflow('A')).toBeNull();

			store.addNode(createNode({ name: 'A' }));

			expect(store.getNodeByNameFromWorkflow('A')).toEqual(expect.objectContaining({ name: 'A' }));
		});

		it('removeNode syncs to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			const node = createNode({ name: 'A' });
			store.setNodes([node]);
			expect(store.getNodeByNameFromWorkflow('A')).toEqual(expect.objectContaining({ name: 'A' }));

			store.removeNode(node);

			expect(store.getNodeByNameFromWorkflow('A')).toBeNull();
		});

		it('removeNodeById syncs to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			const node = createNode({ name: 'A' });
			store.setNodes([node]);
			expect(store.getNodeByNameFromWorkflow('A')).toEqual(expect.objectContaining({ name: 'A' }));

			store.removeNodeById(node.id);

			expect(store.getNodeByNameFromWorkflow('A')).toBeNull();
		});

		it('setConnections syncs to workflowObject for graph traversal', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			store.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			expect(store.getChildNodes('A', NodeConnectionTypes.Main)).toEqual([]);

			store.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(store.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['B']);
			expect(store.getParentNodes('B', NodeConnectionTypes.Main)).toEqual(['A']);
		});

		it('setName syncs name to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			store.setNodes([createNode({ name: 'A' })]);
			expect(store.name).toBe('');

			store.setName('Updated Name');

			expect(store.name).toBe('Updated Name');
			expect(store.getStartNode()).toBeDefined();
		});

		it('setSettings syncs settings to workflowObject', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			expect(store.settings).toEqual({ ...DEFAULT_SETTINGS });

			store.setSettings({ ...DEFAULT_SETTINGS, timezone: 'Europe/Berlin' });

			expect(store.settings).toEqual({ ...DEFAULT_SETTINGS, timezone: 'Europe/Berlin' });
		});

		it('removeNode unpins node data', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			const node = createNode({ name: 'A' });
			store.setNodes([node]);
			store.setPinData({ A: [{ json: { value: 1 } }] });
			expect(store.pinData).toHaveProperty('A');

			store.removeNode(node);

			expect(store.pinData).not.toHaveProperty('A');
		});

		it('removeNodeById unpins node data', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
			const node = createNode({ name: 'A' });
			store.setNodes([node]);
			store.setPinData({ A: [{ json: { value: 1 } }] });
			expect(store.pinData).toHaveProperty('A');

			store.removeNodeById(node.id);

			expect(store.pinData).not.toHaveProperty('A');
		});
	});

	describe('reset', () => {
		it('clears every document-scoped field back to empty defaults', () => {
			const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-reset'));
			const version: WorkflowHistory = {
				versionId: 'v1',
				authors: 'A',
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
				workflowPublishHistory: [],
				name: 'v1',
				description: null,
			};

			store.hydrate({
				id: 'wf-reset',
				name: 'Populated',
				description: 'desc',
				active: true,
				isArchived: true,
				createdAt: 100,
				updatedAt: 200,
				nodes: [createNode({ name: 'A' })],
				connections: {
					A: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
				settings: { executionOrder: 'v1', timezone: 'UTC' },
				tags: ['t-1'],
				pinData: { A: [{ json: {} }] },
				sharedWithProjects: [{ id: 'p' } as ProjectSharingData],
				homeProject: { id: 'p' } as ProjectSharingData,
				scopes: ['workflow:read'] as Scope[],
				versionId: 'v1',
				activeVersionId: 'v1',
				activeVersion: version,
				checksum: 'sum',
				meta: { templateId: 'tpl' },
			});
			store.setViewport({ x: 100, y: 200, zoom: 1.5 });

			store.reset();

			expect(store.name).toBe('');
			expect(store.description).toBe('');
			expect(store.activeVersionId).toBeNull();
			expect(store.activeVersion).toBeNull();
			expect(store.active).toBe(false);
			expect(store.isArchived).toBe(false);
			expect(store.homeProject).toBeNull();
			expect(store.sharedWithProjects).toEqual([]);
			expect(store.scopes).toEqual([]);
			expect(store.tags).toEqual([]);
			expect(store.meta).toEqual({});
			expect(store.settings).toEqual({ ...DEFAULT_SETTINGS });
			expect(store.parentFolder).toBeNull();
			expect(store.usedCredentials).toEqual({});
			expect(store.createdAt).toBe(-1);
			expect(store.updatedAt).toBe(-1);
			expect(store.checksum).toBe('');
			expect(store.versionId).toBe('');
			expect(store.versionData).toEqual({ versionId: '', name: null, description: null });
			expect(store.allNodes).toHaveLength(0);
			expect(store.connectionsBySourceNode).toEqual({});
			expect(store.pinData).toEqual({});
			expect(store.viewport).toBeNull();
		});
	});
});
