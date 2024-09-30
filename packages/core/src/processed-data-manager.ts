import get from 'lodash/get';
import { ApplicationError } from 'n8n-workflow';
import type {
	IProcessedDataManager,
	ICheckProcessedOptions,
	ICheckProcessedOutput,
	ICheckProcessedOutputItems,
	IDataObject,
	ProcessedDataContext,
	ProcessedDataItemTypes,
	ICheckProcessedContextData,
} from 'n8n-workflow';

export class ProcessedDataManager {
	private static instance: ProcessedDataManager;

	private manager: IProcessedDataManager;

	private constructor(manager: IProcessedDataManager) {
		this.manager = manager;
	}

	static async init(manager: IProcessedDataManager): Promise<void> {
		if (ProcessedDataManager.instance) {
			throw new ApplicationError('Processed Data Manager is already initialized');
		}

		ProcessedDataManager.instance = new ProcessedDataManager(manager);
	}

	static getInstance(): ProcessedDataManager {
		if (!ProcessedDataManager.instance) {
			throw new ApplicationError('Processed Data Manager is not initialized');
		}
		return ProcessedDataManager.instance;
	}

	static getManager(): string[] {
		return Object.keys(ProcessedDataManager.instance.manager);
	}

	async checkProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		if (this.manager) {
			return await this.manager.checkProcessed(items, context, contextData, options);
		}
		throw new ApplicationError('There is no manager');
	}

	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutputItems> {
		if (!this.manager) {
			throw new ApplicationError('There is no manager');
		}

		let value;
		const itemLookup = items.reduce((acc, cur, index) => {
			value = JSON.stringify(get(cur, propertyName));
			acc[value ? value.toString() : ''] = index;
			return acc;
		}, {});

		const checkedItems = await this.manager.checkProcessedAndRecord(
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
		if (this.manager) {
			return await this.manager.checkProcessedAndRecord(items, context, contextData, options);
		}

		throw new ApplicationError('There is no manager');
	}

	async removeProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		if (this.manager) {
			return await this.manager.removeProcessed(items, context, contextData, options);
		}

		throw new ApplicationError('There is no manager ');
	}

	async clearAllProcessedItems(
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		if (this.manager) {
			return await this.manager.clearAllProcessedItems(context, contextData, options);
		}

		throw new ApplicationError('There is no manager');
	}

	async getProcessedDataCount(
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		if (this.manager) {
			return await this.manager.getProcessedDataCount(context, contextData, options);
		}

		throw new ApplicationError('There is no manager');
	}
}
