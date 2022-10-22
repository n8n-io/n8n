/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	ICheckProcessedContextData,
	ICheckProcessedOutput,
	IProcessedDataContext,
	IProcessedDataManager,
} from 'n8n-core';
import { In, Not } from 'typeorm';
import { createHash } from 'crypto';

// eslint-disable-next-line import/no-cycle
import {
	DatabaseType,
	Db,
	ExternalHooks,
	GenericHelpers,
	IExternalHooksFileData,
	IWorkflowBase,
} from '..';

export class ProcessedDataManagerNativeDatabase implements IProcessedDataManager {
	private static dbType: string;

	async init(): Promise<void> {
		ProcessedDataManagerNativeDatabase.dbType = (await GenericHelpers.getConfigValue(
			'database.type',
		)) as DatabaseType;

		const externalHooks = ExternalHooks();
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

						await Db.collections.ProcessedData.delete({
							workflowId: workflow.id as string,
							context: Not(In(contexts)),
						});
					},
				],
				afterDelete: [
					async (workflowId: string) => {
						// Clean up all the data of deleted workflows
						await Db.collections.ProcessedData.delete({
							workflowId,
						});
					},
				],
			},
		};

		externalHooks.loadHooks(hookFileData);
	}

	private static createContext(
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): string {
		if (context === 'node') {
			if (!contextData.node) {
				throw new Error(`No node information has been provided and can so not use context 'node'`);
			}
			// Use the node ID to make sure that the data can still be accessed and does not get deleted
			// whenver the node gets renamed
			return `n:${contextData.node.id}`;
		}

		return '';
	}

	private static createValueHash(value: string): string {
		return createHash('md5').update(value).digest('base64');
	}

	async checkProcessed(
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): Promise<ICheckProcessedOutput> {
		const returnData: ICheckProcessedOutput = {
			new: [],
			processed: [],
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const processedData = await Db.collections.ProcessedData.findOne({
			where: {
				workflowId: contextData.workflow.id as string,
				context: ProcessedDataManagerNativeDatabase.createContext(context, contextData),
			},
		});

		if (!processedData) {
			// If there is nothing it the database all items are new
			returnData.new = items;
			return returnData;
		}

		const hashedItems = items.map((item) =>
			ProcessedDataManagerNativeDatabase.createValueHash(item),
		);

		hashedItems.forEach((item, index) => {
			if ((processedData.value.data as string[]).find((data) => data === item)) {
				returnData.processed.push(items[index]);
			} else {
				returnData.new.push(items[index]);
			}
		});

		return returnData;
	}

	async checkProcessedAndRecord(
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): Promise<ICheckProcessedOutput> {
		const dbContext = ProcessedDataManagerNativeDatabase.createContext(context, contextData);

		if (contextData.workflow.id === undefined) {
			throw new Error('Workflow has to have an ID set!');
		}

		const processedData = await Db.collections.ProcessedData.findOne({
			where: {
				workflowId: contextData.workflow.id as string,
				context: ProcessedDataManagerNativeDatabase.createContext(context, contextData),
			},
		});

		const hashedItems = items.map((item) =>
			ProcessedDataManagerNativeDatabase.createValueHash(item),
		);

		if (!processedData) {
			// All items are new so add new entry
			await Db.collections.ProcessedData.insert({
				workflowId: contextData.workflow.id.toString(),
				context: dbContext,
				value: {
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

		hashedItems.forEach((item, index) => {
			if ((processedData.value.data as string[]).find((data) => data === item)) {
				returnData.processed.push(items[index]);
			} else {
				returnData.new.push(items[index]);
				(processedData.value.data as string[]).push(item);
			}
		});

		await Db.collections.ProcessedData.save(processedData);

		return returnData;
	}

	async removeProcessed(
		items: string[],
		context: IProcessedDataContext,
		contextData: ICheckProcessedContextData,
	): Promise<void> {
		const processedData = await Db.collections.ProcessedData.findOne({
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

		let index;
		hashedItems.forEach((item) => {
			index = (processedData.value.data as string[]).findIndex((value) => value === item);
			(processedData.value.data as string[]).splice(index, 1);
		});

		await Db.collections.ProcessedData.save(processedData);
	}
}
