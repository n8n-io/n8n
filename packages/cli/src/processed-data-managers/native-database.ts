import {
	type ICheckProcessedContextData,
	type IProcessedDataManager,
	type ICheckProcessedOptions,
	type ICheckProcessedOutput,
	type IWorkflowBase,
	type ProcessedDataContext,
	type ProcessedDataItemTypes,
	ApplicationError,
} from 'n8n-workflow';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Not } from '@n8n/typeorm';
import { createHash } from 'crypto';

import type {
	IExternalHooksFileData,
	IProcessedDataEntries,
	IProcessedDataLatest,
} from '@/interfaces';
import type { DatabaseType } from '@/databases/types';
import { ExternalHooks } from '@/external-hooks';
import { Container } from 'typedi';
import { ProcessedDataRepository } from '@/databases/repositories/processedData.repository';
import { GlobalConfig } from '@n8n/config';

export class ProcessedDataManagerNativeDatabase implements IProcessedDataManager {
	private static dbType: string;

	async init(): Promise<void> {
		const globalConfig = Container.get(GlobalConfig);
		ProcessedDataManagerNativeDatabase.dbType = globalConfig.database.type as DatabaseType;

		const externalHooks = Container.get(ExternalHooks);
		const hookFileData: IExternalHooksFileData = {
			workflow: {
				afterUpdate: [
					async (workflow: IWorkflowBase) => {
						// Clean up all the data of no longer existing node
						const contexts = workflow.nodes.map((node) =>
							ProcessedDataManagerNativeDatabase.createContext('node', {
								workflow,
								node,
							}),
						);

						// Add also empty else it will delete all the ones with context 'workflow'.
						// It is not possible to make 'context' nullable as it is a PrimaryColumn.
						contexts.push('');

						await Container.get(ProcessedDataRepository).delete({
							workflowId: workflow.id,
							context: Not(In(contexts)),
						});
					},
				],
				afterDelete: [
					async (workflowId: string) => {
						// Clean up all the data of deleted workflows
						await Container.get(ProcessedDataRepository).delete({
							workflowId,
						});
					},
				],
			},
		};

		// externalHooks.loadHooks(hookFileData);
	}

	private static sortEntries(items: ProcessedDataItemTypes[]) {
		return [...items].sort();
	}

	private static compareValues(
		value1: ProcessedDataItemTypes,
		value2: ProcessedDataItemTypes,
	): boolean {
		return value1 > value2;
	}

	private static createContext(
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): string {
		if (context === 'node') {
			console.log('contextData.node', contextData, contextData.node);
			if (!contextData.node) {
				throw new ApplicationError(
					"No node information has been provided and can so not use context 'node'",
				);
			}
			// Use the node ID to make sure that the data can still be accessed and does not get deleted
			// whenver the node gets renamed
			return `n:${contextData.node.id}`;
		}

		return '';
	}

	private static createValueHash(value: ProcessedDataItemTypes): string {
		return createHash('md5').update(value.toString()).digest('base64');
	}

	async checkProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		const returnData: ICheckProcessedOutput = {
			new: [],
			processed: [],
		};

		const processedData = await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id as string,
				context: ProcessedDataManagerNativeDatabase.createContext(context, contextData),
			},
		});

		if (processedData && processedData.value.mode !== options.mode) {
			throw new ApplicationError(
				`Mode is not compatible. Data got originally saved with mode "${processedData?.value.mode}" but gets queried with mode "${options.mode}"`,
			);
		}

		if (!processedData) {
			// If there is nothing it the database all items are new
			returnData.new = items;
			return returnData;
		}

		if (options.mode === 'latest') {
			const processedDataValue = processedData.value as IProcessedDataLatest;

			const incomingItems = ProcessedDataManagerNativeDatabase.sortEntries(items);
			incomingItems.forEach((item) => {
				if (ProcessedDataManagerNativeDatabase.compareValues(item, processedDataValue.data)) {
					returnData.new.push(item);
				} else {
					returnData.processed.push(item);
				}
			});
			return returnData;
		}

		const hashedItems = items.map((item) =>
			ProcessedDataManagerNativeDatabase.createValueHash(item),
		);

		hashedItems.forEach((item, index) => {
			if ((processedData.value.data as string[]).find((entry) => entry === item)) {
				returnData.processed.push(items[index]);
			} else {
				returnData.new.push(items[index]);
			}
		});

		return returnData;
	}

	async checkProcessedAndRecord(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput> {
		const dbContext = ProcessedDataManagerNativeDatabase.createContext(context, contextData);

		if (contextData.workflow.id === undefined) {
			throw new ApplicationError('Workflow has to have an ID set!');
		}

		const processedData = await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id as string,
				context: ProcessedDataManagerNativeDatabase.createContext(context, contextData),
			},
		});

		if (processedData && processedData.value.mode !== options.mode) {
			throw new ApplicationError(
				`Mode is not compatible. Data got originally saved with mode "${processedData?.value.mode}" but gets queried with mode "${options.mode}"`,
			);
		}

		if (options.mode === 'latest') {
			const incomingItems = ProcessedDataManagerNativeDatabase.sortEntries(items);

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

			const returnData: ICheckProcessedOutput = {
				new: [],
				processed: [],
			};

			let largestValue = processedData.value.data as ProcessedDataItemTypes;
			const processedDataValue = processedData.value as IProcessedDataLatest;

			incomingItems.forEach((item) => {
				if (ProcessedDataManagerNativeDatabase.compareValues(item, processedDataValue.data)) {
					returnData.new.push(item);
					if (ProcessedDataManagerNativeDatabase.compareValues(item, largestValue)) {
						largestValue = item;
					}
				} else {
					returnData.processed.push(item);
				}
			});

			processedData.value.data = largestValue;

			await Container.get(ProcessedDataRepository).save(processedData);

			return returnData;
		}

		const hashedItems = items.map((item) =>
			ProcessedDataManagerNativeDatabase.createValueHash(item),
		);

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

		const returnData: ICheckProcessedOutput = {
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

		await Container.get(ProcessedDataRepository).save(processedData);

		return returnData;
	}

	async removeProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		if (options.mode === 'latest') {
			throw new ApplicationError('Removing processed data is not possible in mode "latest"');
		}

		const processedData = await Container.get(ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id as string,
				context: ProcessedDataManagerNativeDatabase.createContext(context, contextData),
			},
		});

		if (!processedData) {
			return;
		}

		const hashedItems = items.map((item) =>
			ProcessedDataManagerNativeDatabase.createValueHash(item),
		);

		const processedDataValue = processedData.value as IProcessedDataEntries;

		let index;
		hashedItems.forEach((item) => {
			index = processedDataValue.data.findIndex((value) => value === item);
			if (index !== -1) {
				processedDataValue.data.splice(index, 1);
			}
		});

		await Container.get(ProcessedDataRepository).save(processedData);
	}
}
