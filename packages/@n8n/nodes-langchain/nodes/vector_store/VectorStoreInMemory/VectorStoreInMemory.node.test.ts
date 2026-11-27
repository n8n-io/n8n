import type { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStoreManager } from '@n8n/ai-utilities';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { VectorStoreInMemory } from './VectorStoreInMemory.node';
import { createInsertContext } from '../../../test/vectorStoreInsert';

it.each([1, 1.1])('clears once and keeps all new documents in v%s', async (version) => {
	const embeddings = mock<Embeddings>();
	embeddings.embedDocuments.mockImplementation(async (texts) => {
		if (!texts.length) throw new Error('Cannot embed an empty batch');
		return texts.map(() => [1]);
	});
	const manager = MemoryVectorStoreManager.getInstance(
		embeddings,
		mock<IExecuteFunctions['logger']>(),
	);
	const memoryKey = `clear-store-v${version}`;
	const scopedKey = `test-workflow-id__${memoryKey}`;
	await manager.addDocuments(scopedKey, [{ pageContent: 'old', metadata: {} }]);
	const clearStore = vi.spyOn(manager, 'clearStore');
	embeddings.embedDocuments.mockClear();
	const documents = [
		{ pageContent: 'first', metadata: {} },
		{ pageContent: 'second', metadata: {} },
	];
	const context = createInsertContext(
		version,
		{ memoryKey, clearStore: true },
		embeddings,
		documents,
	);

	try {
		await new VectorStoreInMemory().execute.call(context);

		expect(clearStore).toHaveBeenCalledExactlyOnceWith(scopedKey);
		expect(embeddings.embedDocuments.mock.calls).toEqual(
			version === 1 ? [[['first', 'second']]] : [[['first']], [['second']]],
		);
		const store = await manager.getVectorStore(scopedKey);
		expect(store.memoryVectors.map(({ content }) => content)).toEqual(['first', 'second']);
	} finally {
		clearStore.mockRestore();
		manager.clearStore(scopedKey);
	}
});
