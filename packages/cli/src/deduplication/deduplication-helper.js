'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.DeduplicationHelper = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const crypto_1 = require('crypto');
const n8n_workflow_1 = require('n8n-workflow');
const assert = __importStar(require('node:assert/strict'));
const deduplication_error_1 = require('@/errors/deduplication.error');
class DeduplicationHelper {
	static sortEntries(items, mode) {
		return items.slice().sort((a, b) => DeduplicationHelper.compareValues(mode, a, b));
	}
	static compareValues(mode, value1, value2) {
		if (mode === 'latestIncrementalKey') {
			const num1 = Number(value1);
			const num2 = Number(value2);
			if (!isNaN(num1) && !isNaN(num2)) {
				return num1 === num2 ? 0 : num1 > num2 ? 1 : -1;
			}
			throw new deduplication_error_1.DeduplicationError(
				'Invalid value. Only numbers are supported in mode "latestIncrementalKey"',
			);
		} else if (mode === 'latestDate') {
			try {
				const date1 = (0, n8n_workflow_1.tryToParseDateTime)(value1);
				const date2 = (0, n8n_workflow_1.tryToParseDateTime)(value2);
				return date1 === date2 ? 0 : date1 > date2 ? 1 : -1;
			} catch (error) {
				throw new deduplication_error_1.DeduplicationError(
					'Invalid value. Only valid dates are supported in mode "latestDate"',
				);
			}
		} else {
			throw new deduplication_error_1.DeduplicationError(
				"Invalid mode. Only 'latestIncrementalKey' and 'latestDate' are supported.",
			);
		}
	}
	static createContext(scope, contextData) {
		if (scope === 'node') {
			if (!contextData.node) {
				throw new deduplication_error_1.DeduplicationError(
					"No node information has been provided and so cannot use scope 'node'",
				);
			}
			return `n:${contextData.node.id}`;
		}
		return '';
	}
	static createValueHash(value) {
		return (0, crypto_1.createHash)('md5').update(value.toString()).digest('base64');
	}
	async findProcessedData(scope, contextData) {
		return await di_1.Container.get(db_1.ProcessedDataRepository).findOne({
			where: {
				workflowId: contextData.workflow.id,
				context: DeduplicationHelper.createContext(scope, contextData),
			},
		});
	}
	validateMode(processedData, options) {
		if (processedData && processedData.value.mode !== options.mode) {
			throw new deduplication_error_1.DeduplicationError(
				'Deduplication data was originally saved with an incompatible setting of the ‘Keep Items Where’ parameter. Try ’Clean Database’ operation to reset.',
			);
		}
	}
	processedDataHasEntries(data) {
		return Array.isArray(data.data);
	}
	processedDataIsLatest(data) {
		return data && !Array.isArray(data.data);
	}
	async handleLatestModes(items, contextData, options, processedData, dbContext) {
		const incomingItems = DeduplicationHelper.sortEntries(items, options.mode);
		if (!processedData) {
			await di_1.Container.get(db_1.ProcessedDataRepository).insert({
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
		const returnData = {
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
		await di_1.Container.get(db_1.ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);
		return returnData;
	}
	async handleHashedItems(items, contextData, options, processedData, dbContext) {
		const hashedItems = items.map((item) => DeduplicationHelper.createValueHash(item));
		if (!processedData) {
			if (options.maxEntries) {
				hashedItems.splice(0, hashedItems.length - options.maxEntries);
			}
			await di_1.Container.get(db_1.ProcessedDataRepository).insert({
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
		const returnData = {
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
		await di_1.Container.get(db_1.ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);
		return returnData;
	}
	async checkProcessedAndRecord(items, scope, contextData, options) {
		const dbContext = DeduplicationHelper.createContext(scope, contextData);
		assert.ok(contextData.workflow.id);
		const processedData = await this.findProcessedData(scope, contextData);
		this.validateMode(processedData, options);
		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			return await this.handleLatestModes(items, contextData, options, processedData, dbContext);
		}
		return await this.handleHashedItems(items, contextData, options, processedData, dbContext);
	}
	async removeProcessed(items, scope, contextData, options) {
		if (['latestIncrementalKey', 'latestDate'].includes(options.mode)) {
			throw new deduplication_error_1.DeduplicationError(
				'Removing processed data is not possible in mode "latest"',
			);
		}
		assert.ok(contextData.workflow.id);
		const processedData = await di_1.Container.get(db_1.ProcessedDataRepository).findOne({
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
		await di_1.Container.get(db_1.ProcessedDataRepository).update(
			{ workflowId: processedData.workflowId, context: processedData.context },
			processedData,
		);
	}
	async clearAllProcessedItems(scope, contextData) {
		await di_1.Container.get(db_1.ProcessedDataRepository).delete({
			workflowId: contextData.workflow.id,
			context: DeduplicationHelper.createContext(scope, contextData),
		});
	}
	async getProcessedDataCount(scope, contextData, options) {
		const processedDataRepository = di_1.Container.get(db_1.ProcessedDataRepository);
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
exports.DeduplicationHelper = DeduplicationHelper;
//# sourceMappingURL=deduplication-helper.js.map
