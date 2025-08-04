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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MessageEventBusLogWriter = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const events_1 = require('events');
const fs_1 = require('fs');
const remove_1 = __importDefault(require('lodash/remove'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importStar(require('path'));
const readline_1 = __importDefault(require('readline'));
const worker_threads_1 = require('worker_threads');
const abstract_event_message_1 = require('../event-message-classes/abstract-event-message');
const event_message_audit_1 = require('../event-message-classes/event-message-audit');
const event_message_confirm_1 = require('../event-message-classes/event-message-confirm');
const event_message_generic_1 = require('../event-message-classes/event-message-generic');
const event_message_node_1 = require('../event-message-classes/event-message-node');
const event_message_workflow_1 = require('../event-message-classes/event-message-workflow');
class MessageEventBusLogWriter {
	constructor() {
		this.logger = di_1.Container.get(backend_common_1.Logger);
		this.globalConfig = di_1.Container.get(config_1.GlobalConfig);
	}
	get worker() {
		return this._worker;
	}
	static async getInstance(options) {
		if (!MessageEventBusLogWriter.instance) {
			MessageEventBusLogWriter.instance = new MessageEventBusLogWriter();
			MessageEventBusLogWriter.options = {
				logFullBasePath: path_1.default.join(
					options?.logBasePath ?? di_1.Container.get(n8n_core_1.InstanceSettings).n8nFolder,
					options?.logBaseName ??
						di_1.Container.get(config_1.GlobalConfig).eventBus.logWriter.logBaseName,
				),
				keepNumberOfFiles:
					options?.keepNumberOfFiles ??
					di_1.Container.get(config_1.GlobalConfig).eventBus.logWriter.keepLogCount,
				maxFileSizeInKB:
					options?.maxFileSizeInKB ??
					di_1.Container.get(config_1.GlobalConfig).eventBus.logWriter.maxFileSizeInKB,
			};
			await MessageEventBusLogWriter.instance.startThread();
		}
		return MessageEventBusLogWriter.instance;
	}
	startLogging() {
		if (this.worker) {
			this.worker.postMessage({ command: 'startLogging', data: {} });
		}
	}
	startRecoveryProcess() {
		if (this.worker) {
			this.worker.postMessage({ command: 'startRecoveryProcess', data: {} });
		}
	}
	isRecoveryProcessRunning() {
		return (0, fs_1.existsSync)(this.getRecoveryInProgressFileName());
	}
	endRecoveryProcess() {
		if (this.worker) {
			this.worker.postMessage({ command: 'endRecoveryProcess', data: {} });
		}
	}
	async startThread() {
		if (this.worker) {
			await this.close();
		}
		await MessageEventBusLogWriter.instance.spawnThread();
		if (this.worker) {
			this.worker.postMessage({ command: 'initialize', data: MessageEventBusLogWriter.options });
		}
	}
	async spawnThread() {
		const parsedName = (0, path_1.parse)(__filename);
		let workerFileName;
		if (backend_common_1.inTest) {
			workerFileName =
				'./dist/eventbus/message-event-bus-writer/message-event-bus-log-writer-worker.js';
		} else {
			workerFileName = path_1.default.join(
				parsedName.dir,
				`${parsedName.name}-worker${parsedName.ext}`,
			);
		}
		this._worker = new worker_threads_1.Worker(workerFileName);
		if (this.worker) {
			this.worker.on('messageerror', async (error) => {
				this.logger.error('Event Bus Log Writer thread error, attempting to restart...', { error });
				await MessageEventBusLogWriter.instance.startThread();
			});
			return true;
		}
		return false;
	}
	async close() {
		if (this.worker) {
			await this.worker.terminate();
			this._worker = undefined;
		}
	}
	putMessage(msg) {
		if (this.worker) {
			this.worker.postMessage({ command: 'appendMessageToLog', data: msg.serialize() });
		}
	}
	confirmMessageSent(msgId, source) {
		if (this.worker) {
			this.worker.postMessage({
				command: 'confirmMessageSent',
				data: new event_message_confirm_1.EventMessageConfirm(msgId, source).serialize(),
			});
		}
	}
	async getMessages(mode = 'all', logHistory = 1) {
		const results = {
			loggedMessages: [],
			sentMessages: [],
			unfinishedExecutions: {},
		};
		const configLogCount = this.globalConfig.eventBus.logWriter.keepLogCount;
		const logCount = logHistory ? Math.min(configLogCount, logHistory) : configLogCount;
		for (let i = logCount; i >= 0; i--) {
			const logFileName = this.getLogFileName(i);
			if (logFileName) {
				await this.readLoggedMessagesFromFile(results, mode, logFileName);
			}
		}
		return results;
	}
	async readLoggedMessagesFromFile(results, mode, logFileName) {
		if (logFileName && (0, fs_1.existsSync)(logFileName)) {
			try {
				const rl = readline_1.default.createInterface({
					input: (0, fs_1.createReadStream)(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					try {
						const json = (0, n8n_workflow_1.jsonParse)(line);
						if (
							(0, abstract_event_message_1.isEventMessageOptions)(json) &&
							json.__type !== undefined
						) {
							const msg = this.getEventMessageObjectByType(json);
							if (msg !== null) results.loggedMessages.push(msg);
							if (msg?.eventName && msg.payload?.executionId) {
								const executionId = msg.payload.executionId;
								switch (msg.eventName) {
									case 'n8n.workflow.started':
										if (!Object.keys(results.unfinishedExecutions).includes(executionId)) {
											results.unfinishedExecutions[executionId] = [];
										}
										results.unfinishedExecutions[executionId] = [msg];
										break;
									case 'n8n.workflow.success':
									case 'n8n.workflow.failed':
									case 'n8n.execution.throttled':
									case 'n8n.execution.started-during-bootup':
										delete results.unfinishedExecutions[executionId];
										break;
									case 'n8n.node.started':
									case 'n8n.node.finished':
										if (!Object.keys(results.unfinishedExecutions).includes(executionId)) {
											results.unfinishedExecutions[executionId] = [];
										}
										results.unfinishedExecutions[executionId].push(msg);
										break;
								}
							}
						}
						if ((0, event_message_confirm_1.isEventMessageConfirm)(json) && mode !== 'all') {
							const removedMessage = (0, remove_1.default)(
								results.loggedMessages,
								(e) => e.id === json.confirm,
							);
							if (mode === 'sent') {
								results.sentMessages.push(...removedMessage);
							}
						}
					} catch (error) {
						this.logger.error(
							`Error reading line messages from file: ${logFileName}, line: ${line}, ${error.message}}`,
						);
					}
				});
				await (0, events_1.once)(rl, 'close');
			} catch {
				this.logger.error(`Error reading logged messages from file: ${logFileName}`);
			}
		}
		return results;
	}
	getLogFileName(counter) {
		if (counter) {
			return `${MessageEventBusLogWriter.options.logFullBasePath}-${counter}.log`;
		} else {
			return `${MessageEventBusLogWriter.options.logFullBasePath}.log`;
		}
	}
	getRecoveryInProgressFileName() {
		return `${MessageEventBusLogWriter.options.logFullBasePath}.recoveryInProgress`;
	}
	cleanAllLogs() {
		for (let i = 0; i <= MessageEventBusLogWriter.options.keepNumberOfFiles; i++) {
			if ((0, fs_1.existsSync)(this.getLogFileName(i))) {
				(0, fs_1.rmSync)(this.getLogFileName(i));
			}
		}
	}
	async getMessagesByExecutionId(executionId, logHistory) {
		const result = [];
		const configLogCount = this.globalConfig.eventBus.logWriter.keepLogCount;
		const logCount = logHistory ? Math.min(configLogCount, logHistory) : configLogCount;
		for (let i = 0; i < logCount; i++) {
			const logFileName = this.getLogFileName(i);
			if (logFileName) {
				result.push(...(await this.readFromFileByExecutionId(executionId, logFileName)));
			}
		}
		return result.sort((a, b) => a.ts.diff(b.ts).toMillis());
	}
	async readFromFileByExecutionId(executionId, logFileName) {
		const messages = [];
		if (logFileName && (0, fs_1.existsSync)(logFileName)) {
			try {
				const rl = readline_1.default.createInterface({
					input: (0, fs_1.createReadStream)(logFileName),
					crlfDelay: Infinity,
				});
				rl.on('line', (line) => {
					try {
						const json = (0, n8n_workflow_1.jsonParse)(line);
						if (
							(0, abstract_event_message_1.isEventMessageOptions)(json) &&
							json.__type !== undefined &&
							json.payload?.executionId === executionId
						) {
							const msg = this.getEventMessageObjectByType(json);
							if (msg !== null) messages.push(msg);
						}
					} catch {
						this.logger.error(
							`Error reading line messages from file: ${logFileName}, line: ${line}`,
						);
					}
				});
				await (0, events_1.once)(rl, 'close');
			} catch {
				this.logger.error(`Error reading logged messages from file: ${logFileName}`);
			}
		}
		return messages;
	}
	async getMessagesAll() {
		return (await this.getMessages('all')).loggedMessages;
	}
	async getMessagesSent() {
		return (await this.getMessages('sent')).sentMessages;
	}
	async getMessagesUnsent() {
		return (await this.getMessages('unsent')).loggedMessages;
	}
	async getUnfinishedExecutions() {
		return (await this.getMessages('unfinished')).unfinishedExecutions;
	}
	async getUnsentAndUnfinishedExecutions() {
		const result = await this.getMessages('unsent');
		return {
			unsentMessages: result.loggedMessages,
			unfinishedExecutions: result.unfinishedExecutions,
		};
	}
	getEventMessageObjectByType(message) {
		switch (message.__type) {
			case '$$EventMessage':
				return new event_message_generic_1.EventMessageGeneric(message);
			case '$$EventMessageWorkflow':
				return new event_message_workflow_1.EventMessageWorkflow(message);
			case '$$EventMessageAudit':
				return new event_message_audit_1.EventMessageAudit(message);
			case '$$EventMessageNode':
				return new event_message_node_1.EventMessageNode(message);
			default:
				return null;
		}
	}
}
exports.MessageEventBusLogWriter = MessageEventBusLogWriter;
//# sourceMappingURL=message-event-bus-log-writer.js.map
