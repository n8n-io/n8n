import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import {
	ApplicationError,
	type ISupplyDataFunctions,
	type IWorkflowDataProxyData,
} from 'n8n-workflow';

import { N8nItemListOutputParser } from '@utils/output_parsers/N8nItemListOutputParser';

import { OutputParserItemList } from '../OutputParserItemList.node';

describe('OutputParserItemList', () => {
	let outputParser: OutputParserItemList;
	const thisArg = mock<ISupplyDataFunctions>({
		helpers: { normalizeItems },
	});
	const workflowDataProxy = mock<IWorkflowDataProxyData>({ $input: mock() });

	beforeEach(() => {
		outputParser = new OutputParserItemList();
		thisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);
		thisArg.addInputData.mockReturnValue({ index: 0 });
		thisArg.addOutputData.mockReturnValue();
		thisArg.getNodeParameter.mockReset();
	});

	describe('supplyData', () => {
		it('should create a parser with default options', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return {};
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			expect(response).toBeInstanceOf(N8nItemListOutputParser);
			expect((response as any).numberOfItems).toBe(3);
		});

		it('should create a parser with custom number of items', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { numberOfItems: 5 };
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			expect(response).toBeInstanceOf(N8nItemListOutputParser);
			expect((response as any).numberOfItems).toBe(5);
		});

		it('should create a parser with unlimited number of items', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { numberOfItems: -1 };
				}

				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			expect(response).toBeInstanceOf(N8nItemListOutputParser);
			expect((response as any).numberOfItems).toBeUndefined();
		});

		it('should create a parser with custom separator', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { separator: ',' };
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			expect(response).toBeInstanceOf(N8nItemListOutputParser);
			expect((response as any).separator).toBe(',');
		});
	});

	describe('parse', () => {
		it('should parse a list with default separator', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return {};
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			const result = await (response as N8nItemListOutputParser).parse('item1\nitem2\nitem3');
			expect(result).toEqual(['item1', 'item2', 'item3']);
		});

		it('should parse a list with custom separator', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { separator: ',' };
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			const result = await (response as N8nItemListOutputParser).parse('item1,item2,item3');
			expect(result).toEqual(['item1', 'item2', 'item3']);
		});

		it('should limit the number of items returned', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { numberOfItems: 2 };
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			const result = await (response as N8nItemListOutputParser).parse(
				'item1\nitem2\nitem3\nitem4',
			);
			expect(result).toEqual(['item1', 'item2']);
		});

		it('should throw an error if not enough items are returned', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options') {
					return { numberOfItems: 5 };
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = await outputParser.supplyData.call(thisArg, 0);
			await expect(
				(response as N8nItemListOutputParser).parse('item1\nitem2\nitem3'),
			).rejects.toThrow('Wrong number of items returned');
		});
	});
});
