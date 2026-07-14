import { describe, it, expect } from 'vitest';
import type { GraphEdge, GraphNode, ProjectDependencyGraph } from '@n8n/api-types';

import {
	buildGraphModel,
	childEntities,
	endpointOf,
	folderDepth,
	isEntityVisible,
	resolveVisibleEdges,
} from '../graph-model';
import type { WorkflowRelationType } from '../graph-model';

const ALL_TYPES = new Set<WorkflowRelationType>([
	'calls-workflow',
	'uses-as-tool',
	'handles-errors-for',
]);

function workflowNode(
	id: string,
	options: {
		expanded?: boolean;
		parentFolderId?: string | null;
		folderPath?: string[];
		active?: boolean;
	} = {},
): GraphNode {
	return {
		id,
		type: 'workflow',
		name: `Workflow ${id}`,
		expanded: options.expanded ?? true,
		metadata: {
			active: options.active ?? false,
			parentFolderId: options.parentFolderId ?? null,
			folderPath: options.folderPath,
			triggerType: 'subworkflow',
		},
	};
}

function folderNode(
	id: string,
	options: { parentFolderId?: string | null; workflowCount?: number } = {},
): GraphNode {
	return {
		id,
		type: 'folder',
		name: `Folder ${id}`,
		expanded: true,
		metadata: {
			parentFolderId: options.parentFolderId ?? null,
			workflowCount: options.workflowCount ?? 0,
		},
	};
}

function edge(sourceId: string, targetId: string, type: GraphEdge['type']): GraphEdge {
	return { sourceId, targetId, type };
}

function graph(nodes: GraphNode[], edges: GraphEdge[]): ProjectDependencyGraph {
	return {
		project: { id: 'p1', name: 'P', type: 'team' },
		nodes,
		edges,
		members: [],
		variables: [],
		stats: {
			totalWorkflows: 0,
			activeWorkflows: 0,
			totalCredentials: 0,
			totalDataTables: 0,
			totalFolders: 0,
			totalVariables: 0,
			totalMembers: 0,
		},
	};
}

/**
 * Fixture: root workflow `w-root`, folder A at root containing `w-a` and nested folder B
 * (inside A) containing `w-b`. `w-ext` is an external (cross-project) referenced workflow.
 */
function rootGraphFixture(): ProjectDependencyGraph {
	return graph(
		[
			workflowNode('w-root', { expanded: true, parentFolderId: null, folderPath: [] }),
			folderNode('A', { parentFolderId: null, workflowCount: 2 }),
			// referenced ghosts living inside folders, with server-provided folder chains
			workflowNode('w-a', { expanded: false, parentFolderId: 'A', folderPath: ['A'] }),
			workflowNode('w-b', { expanded: false, parentFolderId: 'B', folderPath: ['A', 'B'] }),
			// external referenced workflow: no folderPath
			workflowNode('w-ext', { expanded: false }),
		],
		[
			edge('w-root', 'w-a', 'calls-workflow'),
			edge('w-root', 'w-b', 'calls-workflow'),
			edge('w-root', 'w-ext', 'uses-as-tool'),
		],
	);
}

function folderAGraphFixture(): ProjectDependencyGraph {
	return graph(
		[
			workflowNode('w-a', { expanded: true, parentFolderId: 'A', folderPath: ['A'] }),
			folderNode('B', { parentFolderId: 'A', workflowCount: 1 }),
			workflowNode('w-b', { expanded: false, parentFolderId: 'B', folderPath: ['A', 'B'] }),
		],
		[edge('w-a', 'w-b', 'uses-as-tool')],
	);
}

describe('buildGraphModel', () => {
	it('merges ghosts with in-scope nodes, keeping the richer entry', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		expect(model.workflows.get('w-a')?.parentFolderId).toBe('A');
		expect(model.workflows.get('w-a')?.external).toBe(false);
		expect(model.workflows.get('w-ext')?.external).toBe(true);
		expect(model.folders.get('B')?.parentFolderId).toBe('A');
	});

	it('marks tool targets', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		expect(model.toolTargets.has('w-ext')).toBe(true);
		expect(model.toolTargets.has('w-a')).toBe(false);
	});

	it('computes folder depth from the merged hierarchy', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		expect(folderDepth(model, 'A')).toBe(0);
		expect(folderDepth(model, 'B')).toBe(1);
	});
});

describe('endpointOf — edge re-routing to collapsed ancestors', () => {
	it('routes a workflow inside a collapsed folder to that folder', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		expect(endpointOf(model, new Set(), 'w-a')).toBe('A');
	});

	it('routes a nested workflow to its outermost collapsed ancestor', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		// everything collapsed → outermost ancestor A
		expect(endpointOf(model, new Set(), 'w-b')).toBe('A');
		// A expanded, B still collapsed → nested folder B
		expect(endpointOf(model, new Set(['A']), 'w-b')).toBe('B');
		// both expanded → the workflow itself
		expect(endpointOf(model, new Set(['A', 'B']), 'w-b')).toBe('w-b');
	});

	it('routes root and external workflows to themselves', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		expect(endpointOf(model, new Set(), 'w-root')).toBe('w-root');
		expect(endpointOf(model, new Set(), 'w-ext')).toBe('w-ext');
	});
});

describe('resolveVisibleEdges', () => {
	it('deduplicates edges whose endpoints resolve to the same visible pair', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		const edges = resolveVisibleEdges(model, new Set(), ALL_TYPES);
		const callEdges = edges.filter((e) => e.type === 'calls-workflow');
		// w-root→w-a and w-root→w-b both resolve to w-root→A
		expect(callEdges).toHaveLength(1);
		expect(callEdges[0]).toMatchObject({ source: 'w-root', target: 'A' });
	});

	it('drops edges whose endpoints resolve to the same node', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		// w-a→w-b is internal to collapsed A → dropped
		const edges = resolveVisibleEdges(model, new Set(), ALL_TYPES);
		expect(edges.find((e) => e.source === 'A' && e.target === 'A')).toBeUndefined();
	});

	it('re-resolves edges to real children when a folder expands', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		const edges = resolveVisibleEdges(model, new Set(['A']), ALL_TYPES);
		expect(edges.find((e) => e.source === 'w-root' && e.target === 'w-a')).toBeDefined();
		// w-b is still inside collapsed B
		expect(edges.find((e) => e.source === 'w-root' && e.target === 'B')).toBeDefined();
		// internal edge crossing the B boundary
		expect(edges.find((e) => e.source === 'w-a' && e.target === 'B')).toBeDefined();
	});

	it('filters by relationship type without affecting other edges', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		const edges = resolveVisibleEdges(
			model,
			new Set(),
			new Set<WorkflowRelationType>(['uses-as-tool']),
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].type).toBe('uses-as-tool');
	});
});

describe('visibility and children', () => {
	it('hides entities inside collapsed folders', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		expect(isEntityVisible(model, new Set(), 'w-a')).toBe(false);
		expect(isEntityVisible(model, new Set(['A']), 'w-a')).toBe(true);
		expect(isEntityVisible(model, new Set(['A']), 'w-b')).toBe(false);
		expect(isEntityVisible(model, new Set(['A', 'B']), 'w-b')).toBe(true);
		expect(isEntityVisible(model, new Set(), 'w-root')).toBe(true);
	});

	it('lists root-level units including external workflows', () => {
		const model = buildGraphModel([rootGraphFixture()]);
		const ids = childEntities(model, null).map((c) => c.id);
		expect(ids).toContain('w-root');
		expect(ids).toContain('A');
		expect(ids).toContain('w-ext');
		expect(ids).not.toContain('w-a');
	});

	it('lists a fetched folder’s children', () => {
		const model = buildGraphModel([rootGraphFixture(), folderAGraphFixture()]);
		const ids = childEntities(model, 'A').map((c) => c.id);
		expect(ids).toEqual(expect.arrayContaining(['w-a', 'B']));
		expect(ids).not.toContain('w-b');
	});
});
