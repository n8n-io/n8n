import { createHash } from 'crypto';
import type {
	ICheckProcessedContextData,
	IDataDeduplicator,
	ICheckProcessedOptions,
	IDeduplicationOutput,
	DeduplicationScope,
	DeduplicationItemTypes,
	DeduplicationMode,
} from 'n8n-workflow';
import * as assert from 'node:assert/strict';
import { Container } from 'typedi';

import type { ProcessedData } from '@/databases/entities/processed-data';
import { ProcessedDataRepository } from '@/databases/repositories/processed-data.repository';
import { DeduplicationError } from '@/errors/deduplication.error';
import type { IProcessedDataEntries, IProcessedDataLatest } from '@/interfaces';

export class DeduplicationHelper implements IDataDeduplicator {
	private static sortEntries(
		items: DeduplicationItemTypes[],
		mode: DeduplicationMode,
	): DeduplicationItemTypes[] {
		return items.slice().sort((a, b) => (DeduplicationHelper.compareValues(mode, a, b) ? 1 : -1));
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
	): boolean {
		if (mode === 'latestIncrementalKey') {
			const num1 = Number(value1);
			const num2 = Number(value2);
			if (!isNaN(num1) && !isNaN(num2)) {
				return num1 > num2;
			}
			throw new DeduplicationError(
				'Invalid value. Only numbers are supported in mode "latestIncrementalKey"',
			);
		} else if (mode === 'latestDate') {
			const date1 = new Date(value1 as string);
			const date2 = new Date(value2 as string);

			if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
				return date1 > date2;
			} else {
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

	private async fetchProcessedData(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
	): Promise<ProcessedData | null> {
		return await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id as string,
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

	async checkProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		const returnData: IDeduplicationOutput = {
			new: [],
			processed: [],
		};

		const processedData = await this.fetchProcessedData(scope, contextData);

		this.validateMode(processedData, options);

		if (!processedData) {
			// If there is nothing in the database all items are new
			returnData.new = items;
			return returnData;
		}

		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			const processedDataValue = processedData.value as IProcessedDataLatest;

			const incomingItems = DeduplicationHelper.sortEntries(items, options.mode);
			incomingItems.forEach((item) => {
				if (DeduplicationHelper.compareValues(options.mode, item, processedDataValue.data)) {
					returnData.new.push(item);
				} else {
					returnData.processed.push(item);
				}
			});
			return returnData;
		}

		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));

		const processedDataSet = new Set(processedData.value.data as string[]);
		hashedItems.forEach((item, index) => {
			if (processedDataSet.has(item)) {
				returnData.processed.push(items[index]);
			} else {
				returnData.new.push(items[index]);
			}
		});

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

		const processedData = await this.fetchProcessedData(scope, contextData);

		this.validateMode(processedData, options);

		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			const incomingItems = DeduplicationHelper.sortEntries(items, options.mode);

			if (!processedData) {
				// All items are new so add new entries
				await Container.get(ProcessedDataRepository).insert({
					workflowId: contextData.workflow.id.toString(),
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

			let largestValue = processedData.value.data as DeduplicationItemTypes;
			const processedDataValue = processedData.value as IProcessedDataLatest;

			incomingItems.forEach((item) => {
				if (DeduplicationHelper.compareValues(options.mode, item, processedDataValue.data)) {
					returnData.new.push(item);
					if (DeduplicationHelper.compareValues(options.mode, item, largestValue)) {
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

		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));

		if (!processedData) {
			// All items are new so add new entries
			if (options.maxEntries) {
				hashedItems.splice(0, hashedItems.length - options.maxEntries);
			}
			await Container.get(ProcessedDataRepository).insert({
				workflowId: contextData.workflow.id.toString(),
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

		const processedDataValue = processedData.value as IProcessedDataEntries;

		hashedItems.forEach((item, index) => {
			if (processedDataValue.data.find((entry) => entry === item)) {
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
				workflowId: contextData.workflow.id as string,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});

		if (!processedData) {
			return;
		}

		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));

		const processedDataValue = processedData.value as IProcessedDataEntries;

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
			workflowId: contextData.workflow.id as string,
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
				workflowId: contextData.workflow.id as string,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});

		if (options.mode === 'entries') {
			return (processedData?.value as IProcessedDataEntries)?.data?.length ?? 0;
		} else {
			return 0;
		}
	}
}
