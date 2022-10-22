import { IDataObject } from 'n8n-workflow';
import get from 'lodash.get';
import {
	ICheckProcessedContextData,
	ICheckProcessedOptions,
	ICheckProcessedOutput,
	ICheckProcessedOutputItems,
	IProcessedDataConfig,
	IProcessedDataContext,
	IProcessedDataManagers,
} from './Interfaces';

export class ProcessedDataManager {
	private static instance: ProcessedDataManager;

	private managers: IProcessedDataManagers;

	private mode: string;

	constructor(config: IProcessedDataConfig) {
		this.mode = config.mode;
		this.managers = {};
	}

	static async init(config: IProcessedDataConfig, managers: IProcessedDataManagers): Promise<void> {
		if (ProcessedDataManager.instance) {
			throw new Error('Processed Data Manager is already initialized');
		}

		ProcessedDataManager.instance = new ProcessedDataManager(config);

		ProcessedDataManager.instance.managers = managers;
	}

	static getInstance(): ProcessedDataManager {
		if (!ProcessedDataManager.instance) {
			throw new Error('Processed Data Manager is not initialized');
		}
		return ProcessedDataManager.instance;
	}

	static getManagers(): string[] {
		return Object.keys(ProcessedDataManager.instance.managers);
	}

	async checkProcessed(
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].checkProcessed(items, context, contextData, options);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}

	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutputItems> {
		if (!this.managers[this.mode]) {
			throw new Error(`There is no manager for the defined mode "${this.mode}"`);
		}

		let value;
		const itemLookup = items.reduce((acc, cur, index) => {
			value = get(cur, propertyName);
			acc[value ? value.toString() : ''] = index;
			return acc;
		}, {});

		const checkedItems = await this.managers[this.mode].checkProcessedAndRecord(
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
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].checkProcessedAndRecord(items, context, contextData, options);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}

	async removeProcessed(
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): Promise<void> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].removeProcessed(items, context, contextData);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}
}
