import { ref } from 'vue';
import type { INodeUi } from '@/Interface';
import { EXECUTE_WORKFLOW_NODE_TYPE } from 'n8n-workflow';
import type { CanvasConnection } from '../canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_SUBWORKFLOW_GROUP_TYPE,
	createCanvasSubWorkflowGroupNodeId,
} from '../canvas.types';
import { useCanvasSubWorkflowGroups } from './useCanvasSubWorkflowGroups';

const CURRENT_WORKFLOW_ID = 'current-wf';

function executeSubWorkflowNode(id: string, name: string, workflowId: string): INodeUi {
	return {
		id,
		name,
		type: EXECUTE_WORKFLOW_NODE_TYPE,
		typeVersion: 1.2,
		position: [0, 0],
		parameters: {
			source: 'database',
			workflowId: { __rl: true, mode: 'id', value: workflowId },
		},
	} as INodeUi;
}

function setup(nodes: INodeUi[]) {
	return useCanvasSubWorkflowGroups({
		nodes: ref(nodes),
		getNodeDisplaySize: () => ({ width: 100, height: 100 }),
		isGroupExpanded: () => false,
		getCurrentWorkflowId: () => CURRENT_WORKFLOW_ID,
	});
}

describe('useCanvasSubWorkflowGroups', () => {
	describe('host eligibility', () => {
		it('treats an Execute Sub-workflow node with a static target as a group host', () => {
			const { hostNodeIds, groupNodes } = setup([
				executeSubWorkflowNode('host-1', 'Call My Sub-workflow', 'target-1'),
			]);

			expect([...hostNodeIds.value]).toEqual(['host-1']);
			expect(groupNodes.value).toHaveLength(1);
			expect(groupNodes.value[0].type).toBe(CANVAS_SUBWORKFLOW_GROUP_TYPE);
			expect(groupNodes.value[0].id).toBe(createCanvasSubWorkflowGroupNodeId('host-1'));
		});

		it('does not group a self-referencing node (target is the current workflow)', () => {
			const { hostNodeIds, groupNodes } = setup([
				executeSubWorkflowNode('host-1', 'Call Myself', CURRENT_WORKFLOW_ID),
			]);

			expect(hostNodeIds.value.size).toBe(0);
			expect(groupNodes.value).toHaveLength(0);
		});

		it('does not group a node whose target is an expression', () => {
			const { hostNodeIds } = setup([
				executeSubWorkflowNode('host-1', 'Dynamic', '={{ $json.workflowId }}'),
			]);

			expect(hostNodeIds.value.size).toBe(0);
		});

		it('ignores nodes that are not Execute Sub-workflow nodes', () => {
			const other = { id: 'set-1', name: 'Set', type: 'n8n-nodes-base.set' } as INodeUi;

			const { hostNodeIds } = setup([other]);

			expect(hostNodeIds.value.size).toBe(0);
		});
	});

	describe('remapBoundaryConnections', () => {
		it('reroutes a host node edge onto the group node handles', () => {
			const { remapBoundaryConnections } = setup([
				executeSubWorkflowNode('host-1', 'Call My Sub-workflow', 'target-1'),
			]);

			const connection: CanvasConnection = {
				id: 'trigger->host-1',
				source: 'trigger',
				sourceHandle: 'outputs/main/0',
				target: 'host-1',
				targetHandle: 'inputs/main/0',
			};

			const [remapped] = remapBoundaryConnections([connection]);

			expect(remapped.source).toBe('trigger');
			expect(remapped.target).toBe(createCanvasSubWorkflowGroupNodeId('host-1'));
			expect(remapped.targetHandle).toBe(CANVAS_NODE_GROUP_HANDLE_LEFT);
		});

		it('reroutes the source side when the host is the edge source', () => {
			const { remapBoundaryConnections } = setup([
				executeSubWorkflowNode('host-1', 'Call My Sub-workflow', 'target-1'),
			]);

			const connection: CanvasConnection = {
				id: 'host-1->downstream',
				source: 'host-1',
				sourceHandle: 'outputs/main/0',
				target: 'downstream',
				targetHandle: 'inputs/main/0',
			};

			const [remapped] = remapBoundaryConnections([connection]);

			expect(remapped.source).toBe(createCanvasSubWorkflowGroupNodeId('host-1'));
			expect(remapped.sourceHandle).toBe(CANVAS_NODE_GROUP_HANDLE_RIGHT);
			expect(remapped.target).toBe('downstream');
		});

		it('leaves edges between non-host nodes untouched', () => {
			const { remapBoundaryConnections } = setup([
				executeSubWorkflowNode('host-1', 'Call My Sub-workflow', 'target-1'),
			]);

			const connection: CanvasConnection = {
				id: 'trigger->set',
				source: 'trigger',
				sourceHandle: 'outputs/main/0',
				target: 'set',
				targetHandle: 'inputs/main/0',
			};

			const [remapped] = remapBoundaryConnections([connection]);

			expect(remapped).toBe(connection);
		});
	});
});
