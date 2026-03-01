import type {
	IDataObject,
	INode,
	Workflow,
	DeduplicationHelperFunctions,
	IDeduplicationOutput,
	IDeduplicationOutputItems,
	ICheckProcessedOptions,
	DeduplicationScope,
	DeduplicationItemTypes,
	ICheckProcessedContextData,
} from 'n8n-workflow';

import { DataDeduplicationService } from '@/data-deduplication-service';

async function checkProcessedAndRecord(
	items: DeduplicationItemTypes[],
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions,
): Promise<IDeduplicationOutput> {
	return await DataDeduplicationService.getInstance().checkProcessedAndRecord(
		items,
		scope,
		contextData,
		options,
	);
}

async function checkProcessedItemsAndRecord(
	key: string,
	items: IDataObject[],
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions,
): Promise<IDeduplicationOutputItems> {
	return await DataDeduplicationService.getInstance().checkProcessedItemsAndRecord(
		key,
		items,
		scope,
		contextData,
		options,
	);
}

async function removeProcessed(
	items: DeduplicationItemTypes[],
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions,
): Promise<void> {
	return await DataDeduplicationService.getInstance().removeProcessed(
		items,
		scope,
		contextData,
		options,
	);
}

async function clearAllProcessedItems(
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions,
): Promise<void> {
	return await DataDeduplicationService.getInstance().clearAllProcessedItems(
		scope,
		contextData,
		options,
	);
}

async function getProcessedDataCount(
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions,
): Promise<number> {
	return await DataDeduplicationService.getInstance().getProcessedDataCount(
		scope,
		contextData,
		options,
	);
}

export const getDeduplicationHelperFunctions = (
	workflow: Workflow,
	node: INode,
): DeduplicationHelperFunctions => ({
	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		return await checkProcessedAndRecord(items, scope, { node, workflow }, options);
	},
	async checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutputItems> {
		return await checkProcessedItemsAndRecord(
			propertyName,
			items,
			scope,
			{ node, workflow },
			options,
		);
	},
	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<void> {
		return await removeProcessed(items, scope, { node, workflow }, options);
	},
	async clearAllProcessedItems(
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<void> {
		return await clearAllProcessedItems(scope, { node, workflow }, options);
	},
	async getProcessedDataCount(
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<number> {
		return await getProcessedDataCount(scope, { node, workflow }, options);
	},
});
