import type { ProcessedData } from '@n8n/db';
import { ProcessedDataRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createHash } from 'crypto';
import { tryToParseDateTime } from 'n8n-workflow';
import type {
	IProcessedDataEntries,
	IProcessedDataLatest,
	ICheckProcessedContextData,
	IDataDeduplicator,
	ICheckProcessedOptions,
	IDeduplicationOutput,
	DeduplicationScope,
	DeduplicationItemTypes,
	DeduplicationMode,
} from 'n8n-workflow';
import * as assert from 'node:assert/strict';

import { DeduplicationError } from '@/errors/deduplication.error';

export class DeduplicationHelper implements IDataDeduplicator {
	private static sortEntries(
		items: DeduplicationItemTypes[],
		mode: DeduplicationMode,
	): DeduplicationItemTypes[] {
		return items.slice().sort((a, b) => DeduplicationHelper.compareValues(mode, a, b));
	}
	/**
	 * Compares two values based on the provided mode ('latestIncrementalKey' or 'latestDate').
	 *
	 * @param {DeduplicationMode} mode - The mode to determine the comparison logic. Can be either:
	 *   - 'latestIncrementalKey': Compares numeric values and returns true if `value1` is greater than `value2`.
	 *   - 'latestDate': Compares date strings and returns true if `value1` is a later date than `value2`.
	 *
	 * @param {DeduplicationItemTypes} value1 - The first value to compare.
	 *   - If the mode is 'latestIncrementalKey', this should be a numeric value or a string that can be converted to a number.
	 *   - If the mode is 'latestDate', this should be a valid date string.
	 *
	 * @param {DeduplicationItemTypes} value2 - The second value to compare.
	 *   - If the mode is 'latestIncrementalKey', this should be a numeric value or a string that can be converted to a number.
	 *   - If the mode is 'latestDate', this should be a valid date string.
	 *
	 * @returns {boolean} - Returns `true` if `value1` is greater than `value2` based on the comparison mode.
	 *   - In 'latestIncrementalKey' mode, it returns `true` if `value1` is numerically greater than `value2`.
	 *   - In 'latestDate' mode, it returns `true` if `value1` is a later date than `value2`.
	 *
	 * @throws {DeduplicationError} - Throws an error if:
	 *   - The mode is 'latestIncrementalKey' and the values are not valid numbers.
	 *   - The mode is 'latestDate' and the values are not valid date strings.
	 *   - An unsupported mode is provided.
	 */

	private static compareValues(
		mode: DeduplicationMode,
		value1: DeduplicationItemTypes,
		value2: DeduplicationItemTypes,
	): 1 | 0 | -1 {
		if (mode === 'latestIncrementalKey') {
			const num1 = Number(value1);
			const num2 = Number(value2);
			if (!isNaN(num1) && !isNaN(num2)) {
				return num1 === num2 ? 0 : num1 > num2 ? 1 : -1;
			}
			throw new DeduplicationError(
				'Invalid value. Only numbers are supported in mode "latestIncrementalKey"',
			);
		} else if (mode === 'latestDate') {
			try {
				const date1 = tryToParseDateTime(value1);
				const date2 = tryToParseDateTime(value2);

				return date1 === date2 ? 0 : date1 > date2 ? 1 : -1;
			} catch (error) {
				throw new DeduplicationError(
					'Invalid value. Only valid dates are supported in mode "latestDate"',
				);
			}
		} else {
			throw new DeduplicationError(
				"Invalid mode. Only 'latestIncrementalKey' and 'latestDate' are supported.",
			);
		}
	}

	private static createContext(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
	): string {
		if (scope === 'node') {
			if (!contextData.node) {
				throw new DeduplicationError(
					"No node information has been provided and so cannot use scope 'node'",
				);
			}
			// Use the node ID to make sure that the data can still be accessed and does not get deleted
			// whenever the node gets renamed
			return `n:${contextData.node.id}`;
		}
		return '';
	}

	private static createValueHash(value: DeduplicationItemTypes): string {
		return createHash('md5').update(value.toString()).digest('base64');
	}

	private async findProcessedData(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
	): Promise<ProcessedData | null> {
		return await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});
	}

	private validateMode(processedData: ProcessedData | null, options: ICheckProcessedOptions) {
		if (processedData && processedData.value.mode !== options.mode) {
			throw new DeduplicationError(
				'Deduplication data was originally saved with an incompatible setting of the ‘Keep Items Where’ parameter. Try ’Clean Database’ operation to reset.',
			);
		}
	}

	private processedDataHasEntries(
		data: IProcessedDataEntries | IProcessedDataLatest,
	): data is IProcessedDataEntries {
		return Array.isArray(data.data);
	}

	private processedDataIsLatest(
		data: IProcessedDataEntries | IProcessedDataLatest,
	): data is IProcessedDataLatest {
		return data && !Array.isArray(data.data);
	}

	private async handleLatestModes(
		items: DeduplicationItemTypes[],
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
		processedData: ProcessedData | null,
		dbContext: string,
	): Promise<IDeduplicationOutput> {
		const incomingItems = DeduplicationHelper.sortEntries(items, options.mode);

		if (!processedData) {
			// All items are new so add new entries
			await Container.get(ProcessedDataRepository).insert({
				workflowId: contextData.workflow.id,
				context: dbContext,
				value: {
					mode: options.mode,
					data: incomingItems.pop(),
				},
			});

			return {
				new: items,
				processed: [],
			};
		}

		const returnData: IDeduplicationOutput = {
			new: [],
			processed: [],
		};

		if (!this.processedDataIsLatest(processedData.value)) {
			return returnData;
		}

		let largestValue = processedData.value.data;
		const processedDataValue = processedData.value;

		incomingItems.forEach((item) => {
			if (DeduplicationHelper.compareValues(options.mode, item, processedDataValue.data) === 1) {
				returnData.new.push(item);
				if (DeduplicationHelper.compareValues(options.mode, item, largestValue) === 1) {
					largestValue = item;
				}
			} else {
				returnData.processed.push(item);
			}
		});

		processedData.value.data = largestValue;

		await Container.get(ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);

		return returnData;
	}

	private async handleHashedItems(
		items: DeduplicationItemTypes[],
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
		processedData: ProcessedData | null,
		dbContext: string,
	): Promise<IDeduplicationOutput> {
		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));

		if (!processedData) {
			// All items are new so add new entries
			if (options.maxEntries) {
				hashedItems.splice(0, hashedItems.length - options.maxEntries);
			}
			await Container.get(ProcessedDataRepository).insert({
				workflowId: contextData.workflow.id,
				context: dbContext,
				value: {
					mode: options.mode,
					data: hashedItems,
				},
			});

			return {
				new: items,
				processed: [],
			};
		}

		const returnData: IDeduplicationOutput = {
			new: [],
			processed: [],
		};

		if (!this.processedDataHasEntries(processedData.value)) {
			return returnData;
		}

		const processedDataValue = processedData.value;
		const processedItemsSet = new Set(processedDataValue.data);

		hashedItems.forEach((item, index) => {
			if (processedItemsSet.has(item)) {
				returnData.processed.push(items[index]);
			} else {
				returnData.new.push(items[index]);
				processedDataValue.data.push(item);
			}
		});

		if (options.maxEntries) {
			processedDataValue.data.splice(0, processedDataValue.data.length - options.maxEntries);
		}

		await Container.get(ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);

		return returnData;
	}

	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		const dbContext = DeduplicationHelper.createContext(scope, contextData);

		assert.ok(contextData.workflow.id);

		const processedData = await this.findProcessedData(scope, contextData);

		this.validateMode(processedData, options);

		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			return await this.handleLatestModes(items, contextData, options, processedData, dbContext);
		}
		//mode entries
		return await this.handleHashedItems(items, contextData, options, processedData, dbContext);
	}

	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			throw new DeduplicationError('Removing processed data is not possible in mode "latest"');
		}
		assert.ok(contextData.workflow.id);

		const processedData = await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});

		if (!processedData) {
			return;
		}

		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));

		if (!this.processedDataHasEntries(processedData.value)) {
			return;
		}

		const processedDataValue = processedData.value;

		hashedItems.forEach((item) => {
			const index = processedDataValue.data.findIndex((value) => value === item);
			if (index !== -1) {
				processedDataValue.data.splice(index, 1);
			}
		});

		await Container.get(ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);
	}

	async clearAllProcessedItems(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
	): Promise<void> {
		await Container.get(ProcessedDataRepository).delete({
			workflowId: contextData.workflow.id,
			context: DeduplicationHelper.createContext(scope, contextData),
		});
	}

	async getProcessedDataCount(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		const processedDataRepository = Container.get(ProcessedDataRepository);

		const processedData = await processedDataRepository.findOne({
			where: {
				workflowId: contextData.workflow.id,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});

		if (
			options.mode === 'entries' &&
			processedData &&
			this.processedDataHasEntries(processedData.value)
		) {
			return processedData.value.data.length;
		} else {
			return 0;
		}
	}
}
