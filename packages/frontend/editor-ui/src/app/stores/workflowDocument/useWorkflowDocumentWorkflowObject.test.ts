import { describe, it, expect, beforeEach } from 'vitest';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentWorkflowObject,
	type WorkflowDocumentWorkflowObjectDeps,
} from './useWorkflowDocumentWorkflowObject';
import { DEFAULT_SETTINGS } from './useWorkflowDocumentSettings';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createDeps(
	overrides: Partial<WorkflowDocumentWorkflowObjectDeps> = {},
): WorkflowDocumentWorkflowObjectDeps {
	return {
		workflowId: 'wf-1',
		...overrides,
	};
}

describe('useWorkflowDocumentWorkflowObject', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	describe('initial state', () => {
		it('creates a Workflow with empty defaults', () => {
			const { workflowObject } = useWorkflowDocumentWorkflowObject(createDeps());

			expect(workflowObject.value.id).toBe('wf-1');
			expect(workflowObject.value.name).toBe('');
			expect(workflowObject.value.getNode('anything')).toBeNull();
			expect(workflowObject.value.connectionsBySourceNode).toEqual({});
			expect(workflowObject.value.settings).toEqual({ ...DEFAULT_SETTINGS });
		});
	});

	describe('initWorkflowObject', () => {
		it('replaces the workflow object with all provided fields', () => {
			const { workflowObject, initWorkflowObject } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};
			const settings = { ...DEFAULT_SETTINGS, timezone: 'Europe/Berlin' };
			const pinData = { A: [{ json: { v: 1 } }] };

			initWorkflowObject({
				id: 'wf-new',
				name: 'My Workflow',
				nodes: [nodeA, nodeB],
				connections,
				settings,
				pinData,
			});

			expect(workflowObject.value.id).toBe('wf-new');
			expect(workflowObject.value.name).toBe('My Workflow');
			expect(workflowObject.value.getNode('A')).toEqual(expect.objectContaining({ name: 'A' }));
			expect(workflowObject.value.getNode('B')).toEqual(expect.objectContaining({ name: 'B' }));
			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['B']);
			expect(workflowObject.value.settings).toEqual(settings);
			expect(workflowObject.value.pinData).toEqual(pinData);
		});

		it('deep-copies nodes so mutations to the source do not affect the workflow', () => {
			const { workflowObject, initWorkflowObject } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			const node = createNode({ name: 'A', parameters: { key: 'original' } });

			initWorkflowObject({
				name: 'test',
				nodes: [node],
				connections: {},
				settings: { ...DEFAULT_SETTINGS },
				pinData: {},
			});

			node.parameters = { key: 'mutated' };

			expect(workflowObject.value.getNode('A')?.parameters).toEqual({ key: 'original' });
		});

		it('deep-copies connections so mutations to the source do not affect the workflow', () => {
			const { workflowObject, initWorkflowObject } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			initWorkflowObject({
				name: 'test',
				nodes: [createNode({ name: 'A' }), createNode({ name: 'B' })],
				connections,
				settings: { ...DEFAULT_SETTINGS },
				pinData: {},
			});

			connections.A.main[0].push({
				node: 'C',
				type: NodeConnectionTypes.Main,
				index: 0,
			});

			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['B']);
		});
	});

	describe('syncWorkflowObjectNodes', () => {
		it('updates nodes on the workflow object', () => {
			const { workflowObject, syncWorkflowObjectNodes } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			expect(workflowObject.value.getNode('A')).toBeNull();

			syncWorkflowObjectNodes([createNode({ name: 'A' })]);

			expect(workflowObject.value.getNode('A')).toEqual(expect.objectContaining({ name: 'A' }));
		});

		it('replaces previous nodes', () => {
			const { workflowObject, syncWorkflowObjectNodes } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			syncWorkflowObjectNodes([createNode({ name: 'A' })]);
			expect(workflowObject.value.getNode('A')).toEqual(expect.objectContaining({ name: 'A' }));

			syncWorkflowObjectNodes([createNode({ name: 'B' })]);

			expect(workflowObject.value.getNode('A')).toBeNull();
			expect(workflowObject.value.getNode('B')).toEqual(expect.objectContaining({ name: 'B' }));
		});
	});

	describe('syncWorkflowObjectConnections', () => {
		it('updates connections on the workflow object', () => {
			const { workflowObject, syncWorkflowObjectNodes, syncWorkflowObjectConnections } =
				useWorkflowDocumentWorkflowObject(createDeps());

			syncWorkflowObjectNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual([]);

			syncWorkflowObjectConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['B']);
			expect(workflowObject.value.getParentNodes('B', NodeConnectionTypes.Main)).toEqual(['A']);
		});

		it('replaces previous connections', () => {
			const { workflowObject, syncWorkflowObjectNodes, syncWorkflowObjectConnections } =
				useWorkflowDocumentWorkflowObject(createDeps());
			syncWorkflowObjectNodes([
				createNode({ name: 'A' }),
				createNode({ name: 'B' }),
				createNode({ name: 'C' }),
			]);
			syncWorkflowObjectConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});
			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['B']);

			syncWorkflowObjectConnections({
				A: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(workflowObject.value.getChildNodes('A', NodeConnectionTypes.Main)).toEqual(['C']);
		});
	});

	describe('syncWorkflowObjectName', () => {
		it('updates name on the workflow object', () => {
			const { workflowObject, syncWorkflowObjectName } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			expect(workflowObject.value.name).toBe('');

			syncWorkflowObjectName('New Name');

			expect(workflowObject.value.name).toBe('New Name');
		});
	});

	describe('syncWorkflowObjectSettings', () => {
		it('updates settings on the workflow object', () => {
			const { workflowObject, syncWorkflowObjectSettings } = useWorkflowDocumentWorkflowObject(
				createDeps(),
			);
			expect(workflowObject.value.settings).toEqual({ ...DEFAULT_SETTINGS });

			const newSettings = { ...DEFAULT_SETTINGS, timezone: 'Asia/Tokyo' };
			syncWorkflowObjectSettings(newSettings);

			expect(workflowObject.value.settings).toEqual(newSettings);
		});
	});
});
