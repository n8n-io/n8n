import {
	ICheckProcessedContextData,
	ICheckProcessedOutput,
	IProcessedDataConfig,
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

	async checkProcessed(
		items: string[],
		context: 'node' | 'workflow',
		contextData: ICheckProcessedContextData,
	): Promise<ICheckProcessedOutput> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].checkProcessed(items, context, contextData);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}

	async checkProcessedAndRecord(
		items: string[],
		context: 'node' | 'workflow',
		contextData: ICheckProcessedContextData,
	): Promise<ICheckProcessedOutput> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].checkProcessedAndRecord(items, context, contextData);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}

	async removeProcessed(
		items: string[],
		context: 'node' | 'workflow',
		contextData: ICheckProcessedContextData,
	): Promise<void> {
		if (this.managers[this.mode]) {
			return this.managers[this.mode].removeProcessed(items, context, contextData);
		}

		throw new Error(`There is no manager for the defined mode "${this.mode}"`);
	}
}
