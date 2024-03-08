import type { INode, INodeType } from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import { AIService } from '@/services/ai.service';
import config from '@/config';

jest.mock('@/config', () => {
	return {
		getEnv: jest.fn(),
	};
});

jest.mock('@/services/ai/openai', () => {
	return {
		AIProviderOpenAI: jest.fn().mockImplementation(() => {
			return {
				prompt: jest.fn(),
			};
		}),
	};
});

describe('AIService', () => {
	describe('constructor', () => {
		test('should throw if unknown provider type', () => {
			jest.mocked(config).getEnv.mockReturnValue('unknown');

			expect(() => new AIService()).toThrow(ApplicationError);
		});

		test('should not throw if known provider type', () => {
			jest.mocked(config).getEnv.mockReturnValue('openai');

			expect(() => new AIService()).not.toThrow(ApplicationError);
		});
	});

	describe('prompt', () => {
		test('should call model.prompt', async () => {
			const service = new AIService();

			await service.prompt('message');

			expect(service.model.prompt).toHaveBeenCalledWith('message');
		});
	});

	describe('debugError', () => {
		test('should call prompt with error and nodeType', async () => {
			const service = new AIService();
			const promptSpy = jest.spyOn(service, 'prompt').mockResolvedValue('prompt');

			const nodeType = {
				description: {
					name: 'nodeType',
				},
			} as INodeType;
			const error = new NodeOperationError(
				{
					type: 'n8n-nodes-base.error',
					typeVersion: 1,
				} as INode,
				'Error',
			);

			await service.debugError(error, nodeType);

			expect(promptSpy).toHaveBeenCalledWith(expect.stringContaining(nodeType.description.name));
			expect(promptSpy).toHaveBeenCalledWith(
				expect.stringContaining(JSON.stringify(error, null, 2)),
			);
		});
	});
});
