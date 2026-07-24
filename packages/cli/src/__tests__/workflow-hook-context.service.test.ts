import type { INodeType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

describe('WorkflowHookContextService', () => {
	const nodeTypes = mock<NodeTypes>();
	const service = new WorkflowHookContextService(mock(), nodeTypes);

	const nodeTypeWithGroups = (group: string[]): INodeType =>
		({ description: { group } }) as unknown as INodeType;

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReset();
	});

	describe('isTriggerNodeType', () => {
		it('returns true when the resolved node type is a trigger', () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeTypeWithGroups(['trigger']));

			expect(service.isTriggerNodeType('n8n-nodes-base.manualTrigger', 1)).toBe(true);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.manualTrigger', 1);
		});

		it('returns false when the resolved node type is not a trigger', () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeTypeWithGroups(['transform']));

			expect(service.isTriggerNodeType('n8n-nodes-base.set')).toBe(false);
		});

		it('propagates the error when the node type is not registered', () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unrecognized node type');
			});

			expect(() => service.isTriggerNodeType('n8n-nodes-base.unknown')).toThrow(
				'Unrecognized node type',
			);
		});
	});
});
