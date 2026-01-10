import { DeduplicationHelper } from '@/deduplication/deduplication-helper';
import type { ICheckProcessedContextData, ICheckProcessedOptions } from 'n8n-workflow';

describe('Remove Duplicates RSS Feed Bug', () => {
	let deduplicationHelper: DeduplicationHelper;
	let contextData: ICheckProcessedContextData;
	let options: ICheckProcessedOptions;

	beforeEach(() => {
		deduplicationHelper = new DeduplicationHelper();
		contextData = {
			workflow: { id: 'test-workflow-id' },
			node: { id: 'test-node-id', name: 'Remove Duplicates', type: 'removeDuplicates' },
		} as any;
		options = {
			mode: 'entries',
			maxEntries: 1000,
		};
	});

	it('should not discard all items on subsequent RSS feed runs', async () => {
		// Simulate first RSS feed run with 3 items
		const firstRunItems = ['item1', 'item2', 'item3'];

		const firstResult = await deduplicationHelper.checkProcessedAndRecord(
			firstRunItems,
			'node',
			contextData,
			options,
		);

		// First run: all items should be new
		expect(firstResult.new).toHaveLength(3);
		expect(firstResult.processed).toHaveLength(0);

		// Simulate second RSS feed run with 2 existing + 2 new items
		const secondRunItems = ['item2', 'item3', 'item4', 'item5'];

		const secondResult = await deduplicationHelper.checkProcessedAndRecord(
			secondRunItems,
			'node',
			contextData,
			options,
		);

		// Second run: should have 2 new items, 2 processed
		expect(secondResult.new).toHaveLength(2);
		expect(secondResult.new).toEqual(['item4', 'item5']);
		expect(secondResult.processed).toHaveLength(2);
		expect(secondResult.processed).toEqual(['item2', 'item3']);

		// Simulate third RSS feed run with 1 existing + 1 new item
		const thirdRunItems = ['item5', 'item6'];

		const thirdResult = await deduplicationHelper.checkProcessedAndRecord(
			thirdRunItems,
			'node',
			contextData,
			options,
		);

		// Third run: should have 1 new item, 1 processed
		expect(thirdResult.new).toHaveLength(1);
		expect(thirdResult.new).toEqual(['item6']);
		expect(thirdResult.processed).toHaveLength(1);
		expect(thirdResult.processed).toEqual(['item5']);
	});

	it('should handle RSS feed with all new items correctly', async () => {
		// First run
		const firstResult = await deduplicationHelper.checkProcessedAndRecord(
			['rss1', 'rss2'],
			'node',
			contextData,
			options,
		);

		expect(firstResult.new).toEqual(['rss1', 'rss2']);
		expect(firstResult.processed).toEqual([]);

		// Second run with completely new items
		const secondResult = await deduplicationHelper.checkProcessedAndRecord(
			['rss3', 'rss4'],
			'node',
			contextData,
			options,
		);

		expect(secondResult.new).toEqual(['rss3', 'rss4']);
		expect(secondResult.processed).toEqual([]);
	});

	it('should handle RSS feed with all duplicate items correctly', async () => {
		// First run
		await deduplicationHelper.checkProcessedAndRecord(
			['dup1', 'dup2', 'dup3'],
			'node',
			contextData,
			options,
		);

		// Second run with same items
		const result = await deduplicationHelper.checkProcessedAndRecord(
			['dup1', 'dup2', 'dup3'],
			'node',
			contextData,
			options,
		);

		expect(result.new).toEqual([]);
		expect(result.processed).toEqual(['dup1', 'dup2', 'dup3']);
	});
});
