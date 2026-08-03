vi.mock('@langchain/community/vectorstores/zep', () => {
	class ZepVectorStore {}
	return { ZepVectorStore };
});

vi.mock('@langchain/community/vectorstores/zep_cloud', () => {
	class ZepCloudVectorStore {}
	return { ZepCloudVectorStore };
});

vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createVectorStoreNode: (config: any) =>
		class BaseNode {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			async supplyData(this: any, itemIndex: number) {
				const vectorStore = await config.getVectorStoreClient(this, undefined, {}, itemIndex);
				return { response: vectorStore };
			}
		},
}));

import { ZepVectorStore } from '@langchain/community/vectorstores/zep';
import { ZepCloudVectorStore } from '@langchain/community/vectorstores/zep_cloud';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { VectorStoreZep } from './VectorStoreZep.node';

describe('VectorStoreZep', () => {
	const vectorStore = new VectorStoreZep();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	beforeEach(() => {
		vi.resetAllMocks();

		executeFunctions.addInputData.mockReturnValue({ index: 0 });
	});

	it('should get vector store cloud client', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'collectionName':
					return 'test-collection';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue(
			mock({
				apiKey: 'some-key',
				cloud: true,
			}),
		);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(response).toBeInstanceOf(ZepCloudVectorStore);
	});

	it('should get vector store self-hosted client', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'collectionName':
					return 'test-collection';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue(
			mock({
				apiKey: 'some-key',
				apiUrl: 'https://example.com',
				cloud: false,
			}),
		);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(response).toBeInstanceOf(ZepVectorStore);
	});
});
