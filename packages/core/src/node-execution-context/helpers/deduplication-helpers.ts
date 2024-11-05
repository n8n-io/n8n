import type {
	DeduplicationHelperFunctions,
	DeduplicationItemTypes,
	DeduplicationScope,
	ICheckProcessedContextData,
	ICheckProcessedOptions,
	IDataObject,
	IDeduplicationOutput,
	IDeduplicationOutputItems,
	INode,
	Workflow,
} from 'n8n-workflow';

import { DataDeduplicationService } from '@/data-deduplication-service';

export class DeduplicationHelpers {
	private readonly contextData: ICheckProcessedContextData;

	constructor(workflow: Workflow, node: INode) {
		this.contextData = { node, workflow };
	}

	get exported(): DeduplicationHelperFunctions {
		return {
			checkProcessedAndRecord: this.checkProcessedAndRecord.bind(this),
			checkProcessedItemsAndRecord: this.checkProcessedItemsAndRecord.bind(this),
			removeProcessed: this.removeProcessed.bind(this),
			clearAllProcessedItems: this.clearAllProcessedItems.bind(this),
			getProcessedDataCount: this.getProcessedDataCount.bind(this),
		};
	}

	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		return await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			items,
			scope,
			this.contextData,
			options,
		);
	}

	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutputItems> {
		return await DataDeduplicationService.getInstance().checkProcessedItemsAndRecord(
			propertyName,
			items,
			scope,
			this.contextData,
			options,
		);
	}

	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<void> {
		return await DataDeduplicationService.getInstance().removeProcessed(
			items,
			scope,
			this.contextData,
			options,
		);
	}

	async clearAllProcessedItems(
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<void> {
		return await DataDeduplicationService.getInstance().clearAllProcessedItems(
			scope,
			this.contextData,
			options,
		);
	}

	async getProcessedDataCount(
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<number> {
		return await DataDeduplicationService.getInstance().getProcessedDataCount(
			scope,
			this.contextData,
			options,
		);
	}
}
