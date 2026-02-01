import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as transport from '../../../../transport';
import * as classify from '../../../../v2/actions/text/classify.operation';

describe('OpenAI Classify Operation', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	const node = {
		id: '123',
		name: 'OpenAI Node',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 2.1,
		position: [0, 0],
		parameters: {},
	} as INode;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('should use omni-moderation-latest model when version is 2.1', async () => {
		executeFunctions.getNode.mockReturnValue(node);
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			const params = {
				input: 'Lorem ipsum',
				simplify: false,
			};
			return params[param as keyof typeof params];
		});
		apiRequestSpy.mockResolvedValueOnce({ results: [{ flagged: true }] });

		const result = await classify.execute.call(executeFunctions, 0);

		expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/moderations', {
			body: { input: 'Lorem ipsum', model: 'omni-moderation-latest' },
		});
		expect(result).toEqual([
			{
				json: { flagged: true },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should use text-moderation-stable model when version is less than 2.1 and useStableModel is true', async () => {
		executeFunctions.getNode.mockReturnValue({
			...node,
			typeVersion: 2,
		});
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			const params = {
				input: 'Lorem ipsum',
				simplify: false,
				options: { useStableModel: true },
			};
			return params[param as keyof typeof params];
		});
		apiRequestSpy.mockResolvedValueOnce({ results: [{ flagged: true }] });

		const result = await classify.execute.call(executeFunctions, 0);

		expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/moderations', {
			body: { input: 'Lorem ipsum', model: 'text-moderation-stable' },
		});
		expect(result).toEqual([
			{
				json: { flagged: true },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should use text-moderation-latest model when version is less than 2.1 and useStableModel is false', async () => {
		executeFunctions.getNode.mockReturnValue({
			...node,
			typeVersion: 2,
		});
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			const params = {
				input: 'Lorem ipsum',
				simplify: false,
				options: { useStableModel: false },
			};
			return params[param as keyof typeof params];
		});
		apiRequestSpy.mockResolvedValueOnce({ results: [{ flagged: true }] });

		const result = await classify.execute.call(executeFunctions, 0);

		expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/moderations', {
			body: { input: 'Lorem ipsum', model: 'text-moderation-latest' },
		});
		expect(result).toEqual([
			{
				json: { flagged: true },
				pairedItem: { item: 0 },
			},
		]);
	});
});
