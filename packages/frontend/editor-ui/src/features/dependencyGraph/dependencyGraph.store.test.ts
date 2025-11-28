import { vi, describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useDependencyGraphStore } from './dependencyGraph.store';
import * as dependencyGraphApi from './dependencyGraph.api';
import type { DependencyGraph, DependencyGraphNode } from './dependencyGraph.types';

vi.mock('./dependencyGraph.api');

describe('dependencyGraph.store', () => {
	let store: ReturnType<typeof useDependencyGraphStore>;

	const mockGraph: DependencyGraph = {
		nodes: [
			{ id: 'workflow:1', name: 'Workflow 1', type: 'workflow', active: true },
			{ id: 'workflow:2', name: 'Workflow 2', type: 'workflow', active: false },
			{ id: 'credential:1', name: 'API Key', type: 'credential' },
		],
		edges: [
			{ source: 'workflow:1', target: 'credential:1', type: 'uses_credential' },
			{ source: 'workflow:1', target: 'workflow:2', type: 'calls_workflow' },
		],
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useDependencyGraphStore();
		vi.clearAllMocks();
	});

	describe('fetchGraph', () => {
		it('should fetch and store the graph', async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockResolvedValue(mockGraph);

			await store.fetchGraph();

			expect(store.graph).toEqual(mockGraph);
			expect(store.isLoading).toBe(false);
			expect(store.error).toBeNull();
		});

		it('should handle fetch errors', async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockRejectedValue(
				new Error('Network error'),
			);

			await store.fetchGraph();

			expect(store.graph).toBeNull();
			expect(store.error).toBe('Network error');
			expect(store.isLoading).toBe(false);
		});
	});

	describe('filteredNodes', () => {
		beforeEach(async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockResolvedValue(mockGraph);
			await store.fetchGraph();
		});

		it('should return all nodes when no filters applied', () => {
			expect(store.filteredNodes).toHaveLength(3);
		});

		it('should filter out workflows when showWorkflows is false', () => {
			store.toggleWorkflows();
			expect(store.filteredNodes).toHaveLength(1);
			expect(store.filteredNodes[0].type).toBe('credential');
		});

		it('should filter out credentials when showCredentials is false', () => {
			store.toggleCredentials();
			expect(store.filteredNodes).toHaveLength(2);
			expect(store.filteredNodes.every((n) => n.type === 'workflow')).toBe(true);
		});

		it('should show only active workflows when showActiveOnly is true', () => {
			store.toggleActiveOnly();
			const workflowNodes = store.filteredNodes.filter((n) => n.type === 'workflow');
			expect(workflowNodes).toHaveLength(1);
			expect(workflowNodes[0].active).toBe(true);
		});

		it('should filter by search query', () => {
			store.setSearchQuery('API');
			expect(store.filteredNodes).toHaveLength(1);
			expect(store.filteredNodes[0].name).toBe('API Key');
		});

		it('should be case-insensitive search', () => {
			store.setSearchQuery('workflow');
			expect(store.filteredNodes).toHaveLength(2);
		});
	});

	describe('filteredEdges', () => {
		beforeEach(async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockResolvedValue(mockGraph);
			await store.fetchGraph();
		});

		it('should return edges connecting filtered nodes', () => {
			expect(store.filteredEdges).toHaveLength(2);
		});

		it('should exclude edges when source node is filtered out', () => {
			store.toggleWorkflows();
			expect(store.filteredEdges).toHaveLength(0);
		});
	});

	describe('nodeStats', () => {
		it('should return zero counts when no graph', () => {
			expect(store.nodeStats).toEqual({
				totalWorkflows: 0,
				activeWorkflows: 0,
				totalCredentials: 0,
				totalEdges: 0,
			});
		});

		it('should return correct stats when graph is loaded', async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockResolvedValue(mockGraph);
			await store.fetchGraph();

			expect(store.nodeStats).toEqual({
				totalWorkflows: 2,
				activeWorkflows: 1,
				totalCredentials: 1,
				totalEdges: 2,
			});
		});
	});

	describe('selectNode', () => {
		const workflowNode: DependencyGraphNode = {
			id: 'workflow:1',
			name: 'Test Workflow',
			type: 'workflow',
			active: true,
		};

		const credentialNode: DependencyGraphNode = {
			id: 'credential:1',
			name: 'API Key',
			type: 'credential',
		};

		it('should set selected node and fetch workflow dependencies', async () => {
			vi.mocked(dependencyGraphApi.fetchWorkflowDependencies).mockResolvedValue({
				workflowId: '1',
				workflowName: 'Test Workflow',
				dependencies: {
					credentials: [],
					nodeTypes: [],
					calledWorkflows: [],
					webhookPaths: [],
				},
				dependents: {
					calledByWorkflows: [],
				},
			});
			vi.mocked(dependencyGraphApi.fetchImpactAnalysis).mockResolvedValue({
				resourceType: 'workflow',
				resourceId: '1',
				resourceName: 'Test Workflow',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			});

			store.selectNode(workflowNode);

			expect(store.selectedNode).toEqual(workflowNode);
			expect(dependencyGraphApi.fetchWorkflowDependencies).toHaveBeenCalledWith(
				expect.anything(),
				'1',
			);
			expect(dependencyGraphApi.fetchImpactAnalysis).toHaveBeenCalledWith(
				expect.anything(),
				'workflow',
				'1',
			);
		});

		it('should fetch credential usage when credential node selected', async () => {
			vi.mocked(dependencyGraphApi.fetchCredentialUsage).mockResolvedValue({
				credentialId: '1',
				credentialName: 'API Key',
				credentialType: 'httpHeaderAuth',
				usedByWorkflows: [],
			});
			vi.mocked(dependencyGraphApi.fetchImpactAnalysis).mockResolvedValue({
				resourceType: 'credential',
				resourceId: '1',
				resourceName: 'API Key',
				impactedWorkflows: [],
				totalImpactedCount: 0,
				activeImpactedCount: 0,
			});

			store.selectNode(credentialNode);

			expect(store.selectedNode).toEqual(credentialNode);
			expect(dependencyGraphApi.fetchCredentialUsage).toHaveBeenCalledWith(expect.anything(), '1');
			expect(dependencyGraphApi.fetchImpactAnalysis).toHaveBeenCalledWith(
				expect.anything(),
				'credential',
				'1',
			);
		});

		it('should clear details when null is selected', () => {
			store.selectNode(workflowNode);
			store.selectNode(null);

			expect(store.selectedNode).toBeNull();
			expect(store.workflowDependencies).toBeNull();
			expect(store.credentialUsage).toBeNull();
			expect(store.impactAnalysis).toBeNull();
		});
	});

	describe('fetchWorkflowDeps', () => {
		it('should clear data on error', async () => {
			vi.mocked(dependencyGraphApi.fetchWorkflowDependencies).mockRejectedValue(
				new Error('Not found'),
			);

			await store.fetchWorkflowDeps('invalid-id');

			expect(store.workflowDependencies).toBeNull();
		});
	});

	describe('fetchCredentialUsageInfo', () => {
		it('should clear data on error', async () => {
			vi.mocked(dependencyGraphApi.fetchCredentialUsage).mockRejectedValue(new Error('Not found'));

			await store.fetchCredentialUsageInfo('invalid-id');

			expect(store.credentialUsage).toBeNull();
		});
	});

	describe('reset', () => {
		it('should reset all state', async () => {
			vi.mocked(dependencyGraphApi.fetchDependencyGraph).mockResolvedValue(mockGraph);
			await store.fetchGraph();
			store.setSearchQuery('test');

			store.reset();

			expect(store.graph).toBeNull();
			expect(store.selectedNode).toBeNull();
			expect(store.workflowDependencies).toBeNull();
			expect(store.credentialUsage).toBeNull();
			expect(store.impactAnalysis).toBeNull();
			expect(store.error).toBeNull();
			expect(store.searchQuery).toBe('');
		});
	});
});
