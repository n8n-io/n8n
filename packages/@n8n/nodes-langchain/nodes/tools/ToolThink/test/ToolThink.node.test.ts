import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { ToolThink } from '../ToolThink.node';

describe('ToolThink', () => {
	const thinkTool = new ToolThink();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({
		helpers,
	});
	executeFunctions.addInputData.mockReturnValue({ index: 0 });
	executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
		switch (paramName) {
			case 'description':
				return 'Tool description';
			default:
				return undefined;
		}
	});

	describe('Tool response', () => {
		it('should return the same text as response when receiving a text input', async () => {
			const { response } = (await thinkTool.supplyData.call(executeFunctions, 0)) as {
				response: DynamicTool;
			};
			expect(response).toBeInstanceOf(DynamicTool);
			expect(response.description).toEqual('Tool description');
			const res = (await response.invoke('foo')) as string;
			expect(res).toEqual('foo');
		});
	});
});
