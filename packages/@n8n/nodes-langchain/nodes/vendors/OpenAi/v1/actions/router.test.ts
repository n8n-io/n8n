import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import * as audio from './audio';
import { router } from './router';

describe('OpenAI router', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const mockAudio = vi.spyOn(audio.transcribe, 'execute');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should handle NodeApiError undefined error chaining', async () => {
		const errorNode: INode = {
			id: 'error-node-id',
			name: 'ErrorNode',
			type: 'test.error',
			typeVersion: 1,
			position: [100, 200],
			parameters: {},
		};
		const nodeApiError = new NodeApiError(
			errorNode,
			{ message: 'API error occurred', error: { error: { message: 'Rate limit exceeded' } } },
			{ itemIndex: 0 },
		);

		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'audio' : 'transcribe',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(errorNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		mockAudio.mockRejectedValue(nodeApiError);

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
	});
});
