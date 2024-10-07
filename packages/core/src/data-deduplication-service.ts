import get from 'lodash/get';
import type {
	IDataDeduplicator,
	ICheckProcessedOptions,
	ICheckProcessedOutput,
	ICheckProcessedOutputItems,
	IDataObject,
	ProcessedDataContext,
	ProcessedDataItemTypes,
	ICheckProcessedContextData,
} from 'n8n-workflow';
import * as assert from 'node:assert/strict';
export class DataDeduplicationService {
	private static instance: DataDeduplicationService;

	private deduplicator: IDataDeduplicator;

	private constructor(deduplicator: IDataDeduplicator) {
		this.deduplicator = deduplicator;
	}

	private assertDeduplicator() {
		assert.ok(
			this.deduplicator,
			'Manager needs to initialized before use. Make sure to call init()',
		);
	}

	private static assertInstance() {
		assert.ok(
			DataDeduplicationService.instance,
			'Instance needs to initialized before use. Make sure to call init()',
		);
	}

	private static assertSingleInstance() {
		assert.ok(
			!DataDeduplicationService.instance,
			'Instance already initialized. Multiple initializations are not allowed.',
		);
	}

	static async init(deduplicator: IDataDeduplicator): Promise<void> {
		this.assertSingleInstance();
		DataDeduplicationService.instance = new DataDeduplicationService(deduplicator);
	}

	static getInstance(): DataDeduplicationService {
		this.assertInstance();
		return DataDeduplicationService.instance;
	}

	async checkProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		this.assertDeduplicator();
		return await this.deduplicator.checkProcessed(items, context, contextData, options);
	}

	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutputItems> {
		this.assertDeduplicator();
		let value;
		const itemLookup = items.reduce((acc, cur, index) => {
			value = JSON.stringify(get(cur, propertyName));
			acc[value ? value.toString() : ''] = index;
			return acc;
		}, {});

		const checkedItems = await this.deduplicator.checkProcessedAndRecord(
			Object.keys(itemLookup),
			context,
			contextData,
			options,
		);

		return {
			new: checkedItems.new.map((key) => items[itemLookup[key] as number]),
			processed: checkedItems.processed.map((key) => items[itemLookup[key] as number]),
		};
	}

	async checkProcessedAndRecord(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		this.assertDeduplicator();
		return await this.deduplicator.checkProcessedAndRecord(items, context, contextData, options);
	}

	async removeProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		this.assertDeduplicator();
		return await this.deduplicator.removeProcessed(items, context, contextData, options);
	}

	async clearAllProcessedItems(
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		this.assertDeduplicator();
		return await this.deduplicator.clearAllProcessedItems(context, contextData, options);
	}

	async getProcessedDataCount(
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		this.assertDeduplicator();
		return await this.deduplicator.getProcessedDataCount(context, contextData, options);
	}
}
