import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '../../shared/mocking';
import { AIService } from '@/services/ai.service';
import { AIController } from '@/controllers/ai.controller';
import type { AIRequest } from '@/requests';
import type { INode, INodeType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { NodeTypes } from '@/NodeTypes';

describe('AIController', () => {
	const aiService = mockInstance(AIService);
	const nodeTypesService = mockInstance(NodeTypes);
	const controller = Container.get(AIController);

	describe('debugError', () => {
		it('should retrieve nodeType based on error and call aiService.debugError', async () => {
			const nodeType = {
				description: {},
			} as INodeType;
			const error = new NodeOperationError(
				{
					type: 'n8n-nodes-base.error',
					typeVersion: 1,
				} as INode,
				'Error message',
			);

			const req = mock<AIRequest.DebugError>({
				body: {
					error,
				},
			});

			nodeTypesService.getByNameAndVersion.mockReturnValue(nodeType);

			await controller.debugError(req);

			expect(aiService.debugError).toHaveBeenCalledWith(error, nodeType);
		});
	});
});
