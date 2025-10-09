'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MemoryBufferWindow = exports.MemoryChatBufferSingleton = void 0;
const memory_1 = require('langchain/memory');
const n8n_workflow_1 = require('n8n-workflow');
const helpers_1 = require('@utils/helpers');
const logWrapper_1 = require('@utils/logWrapper');
const sharedFields_1 = require('@utils/sharedFields');
const descriptions_1 = require('../descriptions');
class MemoryChatBufferSingleton {
	constructor() {
		this.memoryBuffer = new Map();
	}
	static getInstance() {
		if (!MemoryChatBufferSingleton.instance) {
			MemoryChatBufferSingleton.instance = new MemoryChatBufferSingleton();
		}
		return MemoryChatBufferSingleton.instance;
	}
	async getMemory(sessionKey, memoryParams) {
		await this.cleanupStaleBuffers();
		let memoryInstance = this.memoryBuffer.get(sessionKey);
		if (memoryInstance) {
			memoryInstance.last_accessed = new Date();
		} else {
			const newMemory = new memory_1.BufferWindowMemory(memoryParams);
			memoryInstance = {
				buffer: newMemory,
				created: new Date(),
				last_accessed: new Date(),
			};
			this.memoryBuffer.set(sessionKey, memoryInstance);
		}
		return memoryInstance.buffer;
	}
	async cleanupStaleBuffers() {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		for (const [key, memoryInstance] of this.memoryBuffer.entries()) {
			if (memoryInstance.last_accessed < oneHourAgo) {
				await this.memoryBuffer.get(key)?.buffer.clear();
				this.memoryBuffer.delete(key);
			}
		}
	}
}
exports.MemoryChatBufferSingleton = MemoryChatBufferSingleton;
class MemoryBufferWindow {
	constructor() {
		this.description = {
			displayName: 'Simple Memory',
			name: 'memoryBufferWindow',
			icon: 'fa:database',
			iconColor: 'black',
			group: ['transform'],
			version: [1, 1.1, 1.2, 1.3],
			description: 'Stores in n8n memory, so no credentials required',
			defaults: {
				name: 'Simple Memory',
			},
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Memory'],
					Memory: ['For beginners'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/',
						},
					],
				},
			},
			inputs: [],
			outputs: [n8n_workflow_1.NodeConnectionTypes.AiMemory],
			outputNames: ['Memory'],
			properties: [
				(0, sharedFields_1.getConnectionHintNoticeField)([
					n8n_workflow_1.NodeConnectionTypes.AiAgent,
				]),
				{
					displayName: 'Session Key',
					name: 'sessionKey',
					type: 'string',
					default: 'chat_history',
					description: 'The key to use to store the memory in the workflow data',
					displayOptions: {
						show: {
							'@version': [1],
						},
					},
				},
				{
					displayName: 'Session ID',
					name: 'sessionKey',
					type: 'string',
					default: '={{ $json.sessionId }}',
					description: 'The key to use to store the memory',
					displayOptions: {
						show: {
							'@version': [1.1],
						},
					},
				},
				{
					...descriptions_1.sessionIdOption,
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 1.2 } }],
						},
					},
				},
				(0, descriptions_1.expressionSessionKeyProperty)(1.3),
				descriptions_1.sessionKeyProperty,
				descriptions_1.contextWindowLengthProperty,
			],
		};
	}
	async supplyData(itemIndex) {
		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex);
		const workflowId = this.getWorkflow().id;
		const memoryInstance = MemoryChatBufferSingleton.getInstance();
		const nodeVersion = this.getNode().typeVersion;
		let sessionId;
		if (nodeVersion >= 1.2) {
			sessionId = (0, helpers_1.getSessionId)(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionKey', itemIndex);
		}
		const memory = await memoryInstance.getMemory(`${workflowId}__${sessionId}`, {
			k: contextWindowLength,
			inputKey: 'input',
			memoryKey: 'chat_history',
			outputKey: 'output',
			returnMessages: true,
		});
		return {
			response: (0, logWrapper_1.logWrapper)(memory, this),
		};
	}
}
exports.MemoryBufferWindow = MemoryBufferWindow;
//# sourceMappingURL=MemoryBufferWindow.node.js.map
