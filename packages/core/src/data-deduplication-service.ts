import get from 'lodash/get';
import type {
	IDataDeduplicator,
	ICheckProcessedOptions,
	IDeduplicationOutput,
	IDeduplicationOutputItems,
	IDataObject,
	DeduplicationScope,
	DeduplicationItemTypes,
	ICheckProcessedContextData,
} from 'n8n-workflow';
import * as assert from 'node:assert/strict';

/**
 * A singleton service responsible for data deduplication.
 * This service wraps around the IDataDeduplicator interface and provides methods to handle
 * deduplication-related operations such as checking, recording, and clearing processed data.
 */
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

	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutputItems> {
		this.assertDeduplicator();
		let value;
		const itemLookup = items.reduce((acc, cur, index) => {
			value = JSON.stringify(get(cur, propertyName));
			acc[value ? value.toString() : ''] = index;
			return acc;
		}, {});

		const checkedItems = await this.deduplicator.checkProcessedAndRecord(
			Object.keys(itemLookup),
			scope,
			contextData,
			options,
		);

		return {
			new: checkedItems.new.map((key) => items[itemLookup[key] as number]),
			processed: checkedItems.processed.map((key) => items[itemLookup[key] as number]),
		};
	}

	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		this.assertDeduplicator();
		return await this.deduplicator.checkProcessedAndRecord(items, scope, contextData, options);
	}

	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		this.assertDeduplicator();
		return await this.deduplicator.removeProcessed(items, scope, contextData, options);
	}

	async clearAllProcessedItems(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		this.assertDeduplicator();
		return await this.deduplicator.clearAllProcessedItems(scope, contextData, options);
	}

	async getProcessedDataCount(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		this.assertDeduplicator();
		return await this.deduplicator.getProcessedDataCount(scope, contextData, options);
	}
}
