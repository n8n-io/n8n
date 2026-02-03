import { type ChatMessageId, type ChatSessionId, ChatHubConversationModel } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, IExecutionResponse, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { InstanceSettings } from 'n8n-core';
import {
	OperationalError,
	ManualExecutionCancelledError,
	type IWorkflowBase,
	jsonParse,
	jsonStringify,
	StructuredChunk,
	IRunExecutionData,
	WorkflowExecuteMode,
	NodeConnectionTypes,
	INodeExecutionData,
	sleep,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ChatExecutionManager } from '@/chat/chat-execution-manager';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import {
	EXECUTION_FINISHED_STATUSES,
	EXECUTION_POLL_INTERVAL,
	SUPPORTED_RESPONSE_MODES,
} from './chat-hub.constants';
import { ChatTriggerResponseMode, NonStreamingResponseMode } from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatStreamService } from './chat-stream.service';
import { createStructuredChunkAggregator } from './stream-capturer';
import { getLastNodeExecuted, shouldResumeImmediately } from '../../chat/utils';

@Service()
export class ChatHubExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionService: ExecutionService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionManager: ChatExecutionManager,
		private readonly activeExecutions: ActiveExecutions,
		private readonly instanceSettings: InstanceSettings,
		private readonly chatStreamService: ChatStreamService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly messageRepository: ChatHubMessageRepository,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async execute(user: User, workflowData: IWorkflowBase, executionData: IRunExecutionData) {
		return await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
			undefined,
			false,
			'chat',
		);
	}

	async stop(executionId: string, workflowId: string) {
		return await this.executionService.stop(executionId, [workflowId]);
	}

	/**
	 * Execute a chat workflow with cleanup and streaming
	 */
	async executeChatWorkflowWithCleanup(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		retryOfMessageId: ChatMessageId | null,
		responseMode: ChatTriggerResponseMode,
	) {
		try {
			const executionMode = model.provider === 'n8n' ? 'webhook' : 'chat';

			await this.executeChatWorkflow(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
				responseMode,
			);
		} catch (error) {
			this.logger.error(`Error in chat execution: ${error}`);

			const errorMessageId = uuidv4();
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await this.messageRepository.createAIMessage({
				id: errorMessageId,
				sessionId,
				previousMessageId,
				content: errorMessage,
				model,
				retryOfMessageId,
				status: 'error',
			});

			await this.chatStreamService.sendErrorDirect(
				user.id,
				sessionId,
				errorMessageId,
				errorMessage,
			);
			await this.chatStreamService.endExecution(user.id, sessionId, 'error');
		} finally {
			if (model.provider !== 'n8n') {
				await this.chatHubWorkflowService.deleteChatWorkflow(workflowData.id);
			}
		}
	}

	/**
	 * Execute a chat workflow
	 */
	private async executeChatWorkflow(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		retryOfMessageId: ChatMessageId | null,
		executionMode: WorkflowExecuteMode,
		responseMode: ChatTriggerResponseMode,
	) {
		this.logger.debug(
			`Starting execution of workflow "${workflowData.name}" with ID ${workflowData.id}`,
		);

		if (!SUPPORTED_RESPONSE_MODES.includes(responseMode)) {
			throw new BadRequestError(`Response mode "${responseMode}" is not supported yet.`);
		}

		if (responseMode === 'lastNode' || responseMode === 'responseNodes') {
			return await this.executeLastNode(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
				responseMode,
			);
		} else if (responseMode === 'streaming') {
			return await this.executeWithStreaming(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
			);
		}
	}

	/**
	 * Execute a workflow with streaming output
	 */
	private async executeWithStreaming(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: string,
		previousMessageId: string,
		retryOfMessageId: string | null,
		executionMode: WorkflowExecuteMode,
	) {
		let executionId: string | undefined;
		let executionStatus: 'success' | 'error' | 'cancelled' = 'success';

		const workflowId = workflowData.id;

		// Start the execution (tracks state for the whole streaming session)
		await this.chatStreamService.startExecution(user.id, sessionId);

		// Create aggregator to handle multiple messages (e.g., tool calls followed by response)
		const aggregator = createStructuredChunkAggregator(previousMessageId, retryOfMessageId, {
			onBegin: async (message) => {
				// Save the AI message to DB
				await this.messageRepository.createAIMessage({
					id: message.id,
					sessionId,
					previousMessageId: message.previousMessageId ?? previousMessageId,
					content: '',
					model,
					executionId,
					retryOfMessageId: message.retryOfMessageId,
					status: 'running',
				});

				// Start the stream for this message
				await this.chatStreamService.startStream({
					userId: user.id,
					sessionId,
					messageId: message.id,
					previousMessageId: message.previousMessageId,
					retryOfMessageId: message.retryOfMessageId,
					executionId: executionId ? parseInt(executionId, 10) : null,
				});
			},
			onItem: async (message, chunk) => {
				await this.chatStreamService.sendChunk(sessionId, message.id, chunk);
			},
			onEnd: async (message) => {
				// Update the message in the database
				await this.messageRepository.updateChatMessage(message.id, {
					content: message.content,
					status: message.status,
				});

				// End the stream for this message
				await this.chatStreamService.endStream(sessionId, message.id, message.status);
			},
			onError: async (message, errorText) => {
				let contentToSave = message.content;
				if (!contentToSave && errorText) {
					contentToSave = errorText;
				} else if (!contentToSave) {
					contentToSave = executionId
						? ((await this.waitForErrorDetails(executionId, workflowId)) ?? 'Unknown error')
						: 'Request was not processed';
				}

				await this.messageRepository.manager.transaction(async (trx) => {
					await this.messageRepository.updateChatMessage(
						message.id,
						{ content: contentToSave },
						trx,
					);

					// When messages are cancelled they're already marked cancelled on `stopGeneration`
					const savedMessage = await this.messageRepository.getOneById(
						message.id,
						sessionId,
						[],
						trx,
					);
					if (savedMessage?.status === 'cancelled') {
						executionStatus = 'cancelled';
						// End the stream with cancelled status
						await this.chatStreamService.endStream(sessionId, message.id, 'cancelled');
						return;
					}

					// Otherwise mark them as errored
					executionStatus = 'error';
					await this.messageRepository.updateChatMessage(message.id, { status: 'error' }, trx);

					await this.chatStreamService.sendError(sessionId, message.id, contentToSave);
					await this.chatStreamService.endStream(sessionId, message.id, 'error');
				});
			},
			onCancel: async (message) => {
				// Save content that was generated so far
				await this.messageRepository.updateChatMessage(message.id, {
					content: message.content,
					status: 'cancelled',
				});

				// End stream with cancelled status
				await this.chatStreamService.endStream(sessionId, message.id, 'cancelled');
			},
		});

		// Create a fake Response-like object that routes to ChatStreamService via aggregator
		const { adapter: streamAdapter, waitForPendingOperations } =
			this.createStreamAdapter(aggregator);

		try {
			const execution = await this.workflowExecutionService.executeChatWorkflow(
				user,
				workflowData,
				executionData,
				streamAdapter,
				true,
				executionMode,
			);

			executionId = execution.executionId;

			if (!executionId) {
				throw new OperationalError('There was a problem starting the chat execution.');
			}

			await this.waitForExecutionCompletion(executionId);

			// Wait for all pending aggregator operations to complete (message status updates, etc.)
			await waitForPendingOperations();
		} catch (error) {
			if (error instanceof ManualExecutionCancelledError) {
				executionStatus = 'cancelled';
				// On multi-main, the stream doesn't send an error chunk on cancellation,
				// so we need to explicitly cancel all active messages.
				// On single-main, the onError handler already handles this via the error chunk.
				if (this.instanceSettings.isMultiMain) {
					await aggregator.cancelAll();
				}
			} else {
				executionStatus = 'error';
				throw error;
			}
		} finally {
			// Wait for pending operations even on error to ensure proper cleanup
			await waitForPendingOperations();
			// End the execution (cleanup session state)
			await this.chatStreamService.endExecution(user.id, sessionId, executionStatus);
		}
	}

	/**
	 * Execute a workflow and wait for completion (for lastNode and responseNodes modes)
	 */
	private async executeLastNode(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: string,
		previousMessageId: string,
		retryOfMessageId: string | null,
		executionMode: WorkflowExecuteMode,
		responseMode: NonStreamingResponseMode,
	) {
		const running = await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
			undefined,
			false,
			executionMode,
		);

		const messageId = uuidv4();
		const executionId = running.executionId;

		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		// Start the execution via WebSocket
		await this.chatStreamService.startExecution(user.id, sessionId);

		// Save the AI message as running
		await this.messageRepository.createAIMessage({
			id: messageId,
			content: '',
			sessionId,
			executionId,
			model,
			previousMessageId,
			retryOfMessageId,
			status: 'running',
		});

		// Send begin event via WebSocket
		await this.chatStreamService.startStream({
			userId: user.id,
			sessionId,
			messageId,
			previousMessageId,
			retryOfMessageId,
			executionId: parseInt(executionId, 10),
		});

		try {
			await this.waitForExecutionCompletion(executionId);
			const execution = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (!execution) {
				throw new OperationalError(
					'Chat execution not found after completion - make sure your instance is saving executions.',
				);
			}

			// Check for execution errors
			if (!['success', 'waiting', 'canceled'].includes(execution.status)) {
				const errorMessage = this.getErrorMessage(execution) ?? 'Failed to generate a response';
				throw new OperationalError(errorMessage);
			}

			const message = this.getMessageFromExecution(execution, responseMode);
			const status = execution?.status === 'waiting' ? 'waiting' : 'success';

			// Send the message content via WebSocket
			if (message) {
				await this.chatStreamService.sendChunk(sessionId, messageId, message);
			}

			// Update message in DB
			await this.messageRepository.updateChatMessage(messageId, {
				content: message ?? '',
				status,
			});

			// End the stream
			await this.chatStreamService.endStream(sessionId, messageId, status);

			// End the execution
			await this.chatStreamService.endExecution(
				user.id,
				sessionId,
				status === 'waiting' ? 'success' : status,
			);

			if (status === 'waiting' && responseMode === 'responseNodes') {
				const lastNode = getLastNodeExecuted(execution);
				if (lastNode && shouldResumeImmediately(lastNode)) {
					this.logger.debug(
						`Resuming execution ${execution.id} immediately after wait in node ${lastNode.name}`,
					);
					await this.resumeChatExecution(
						execution,
						'',
						sessionId,
						user,
						messageId,
						model,
						responseMode,
					);
				}
			}
		} catch (e: unknown) {
			if (e instanceof ManualExecutionCancelledError) {
				// When messages are cancelled they're already marked cancelled on `stopGeneration`
				await this.chatStreamService.endExecution(user.id, sessionId, 'cancelled');
				return;
			}

			const errorMessage =
				e instanceof Error ? e.message : 'Unknown error occurred during chat execution';

			// Update message with error
			await this.messageRepository.updateChatMessage(messageId, {
				content: errorMessage,
				status: 'error',
			});

			// Send error via WebSocket
			await this.chatStreamService.sendChunk(sessionId, messageId, errorMessage);
			await this.chatStreamService.endStream(sessionId, messageId, 'error');
			await this.chatStreamService.endExecution(user.id, sessionId, 'error');
		}
	}

	/**
	 * Resume a chat execution (for responseNodes mode when execution is waiting)
	 */
	async resumeChatExecution(
		execution: IExecutionResponse,
		message: string,
		sessionId: ChatSessionId,
		user: User,
		previousMessageId: ChatMessageId,
		model: ChatHubConversationModel,
		responseMode: 'responseNodes',
	) {
		let currentExecution = execution;
		let currentMessage = message;
		let currentPreviousMessageId = previousMessageId;

		while (true) {
			await this.resumeExecution(sessionId, currentExecution, currentMessage);
			const messageId = uuidv4();

			// Start new stream for the resumed execution
			await this.chatStreamService.startExecution(user.id, sessionId);

			// Save the AI message as running
			await this.messageRepository.createAIMessage({
				id: messageId,
				content: '',
				sessionId,
				executionId: currentExecution.id,
				model,
				previousMessageId: currentPreviousMessageId,
				retryOfMessageId: null,
				status: 'running',
			});

			await this.chatStreamService.startStream({
				userId: user.id,
				sessionId,
				messageId,
				previousMessageId: currentPreviousMessageId,
				retryOfMessageId: null,
				executionId: parseInt(currentExecution.id, 10),
			});

			await this.waitForExecutionCompletion(currentExecution.id);

			const completed = await this.executionRepository.findSingleExecution(currentExecution.id, {
				includeData: true,
				unflattenData: true,
			});

			if (!completed) {
				throw new OperationalError(
					'Chat execution not found after completion - make sure your instance is saving executions.',
				);
			}

			if (!['success', 'waiting', 'canceled'].includes(completed.status)) {
				const errorMessage = this.getErrorMessage(completed) ?? 'Failed to generate a response';
				throw new OperationalError(errorMessage);
			}

			const reply = this.getMessageFromExecution(completed, responseMode);
			const status = completed?.status === 'waiting' ? 'waiting' : 'success';

			// Send the message content via WebSocket
			if (reply) {
				await this.chatStreamService.sendChunk(sessionId, messageId, reply);
			}

			// Update message in DB
			await this.messageRepository.updateChatMessage(messageId, {
				content: reply ?? '',
				status,
			});

			// End the stream
			await this.chatStreamService.endStream(sessionId, messageId, status);
			await this.chatStreamService.endExecution(
				user.id,
				sessionId,
				status === 'waiting' ? 'success' : status,
			);

			const lastNode = getLastNodeExecuted(completed);
			if (status === 'waiting' && lastNode && shouldResumeImmediately(lastNode)) {
				// Resuming execution immediately, so mark the last message as successful
				this.logger.debug(
					`Resuming execution ${completed.id} immediately after wait in node ${lastNode.name}`,
				);
				await this.messageRepository.updateChatMessage(messageId, {
					status: 'success',
				});

				// There's no new human input
				currentMessage = '';
				currentExecution = completed;
				currentPreviousMessageId = messageId;
			} else {
				// Finished or waiting for user input
				return;
			}
		}
	}

	/**
	 * Resume a paused execution with new input
	 */
	private async resumeExecution(
		sessionId: ChatSessionId,
		execution: IExecutionResponse,
		message: string,
	) {
		await this.executionManager.runWorkflow(execution, {
			action: 'sendMessage',
			chatInput: message,
			sessionId,
		});
	}

	async waitForExecutionCompletion(executionId: string): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			return await this.waitForExecutionPoller(executionId);
		} else {
			return await this.waitForExecutionPromise(executionId);
		}
	}

	private async waitForExecutionPoller(executionId: string): Promise<void> {
		return await new Promise<void>((resolve, reject) => {
			const poller = setInterval(async () => {
				try {
					const execution = await this.executionRepository.findSingleExecution(executionId, {
						includeData: false,
						unflattenData: false,
					});

					// Stop polling when execution is done (or missing if instance doesn't save executions)
					if (!execution || EXECUTION_FINISHED_STATUSES.includes(execution.status)) {
						this.logger.debug(
							`Execution ${executionId} finished with status ${execution?.status ?? 'missing'}`,
						);
						clearInterval(poller);

						if (execution?.status === 'canceled') {
							reject(new ManualExecutionCancelledError(executionId));
						} else {
							resolve();
						}
					}
				} catch (error) {
					this.logger.error(`Stopping polling for execution ${executionId} due to error.`);
					clearInterval(poller);

					if (error instanceof Error) {
						this.logger.error(`Error while polling execution ${executionId}: ${error.message}`, {
							error,
						});
					} else {
						this.logger.error(`Unknown error while polling execution ${executionId}`, { error });
					}

					if (error instanceof Error) {
						reject(error);
					} else {
						reject(new Error('Unknown error while polling execution status'));
					}
				}
			}, EXECUTION_POLL_INTERVAL);
		});
	}

	private async waitForExecutionPromise(executionId: string): Promise<void> {
		try {
			// Wait until the execution finishes (or errors) so that we don't delete the workflow too early
			const result = await this.activeExecutions.getPostExecutePromise(executionId);
			if (!result) {
				throw new OperationalError('There was a problem executing the chat workflow.');
			}
		} catch (error: unknown) {
			if (error instanceof ExecutionNotFoundError) {
				return;
			}

			if (error instanceof ManualExecutionCancelledError) {
				throw error;
			}

			if (error instanceof Error) {
				this.logger.error(`Error during chat workflow execution: ${error}`);
			}
			throw error;
		}
	}

	/**
	 * Wait for error details to be available in execution DB using exponential backoff
	 * @param executionId - The execution ID to fetch error details from
	 * @param workflowId - The workflow ID for the execution
	 * @returns The error message if found, undefined otherwise
	 */
	private async waitForErrorDetails(
		executionId: string,
		workflowId: string,
	): Promise<string | undefined> {
		const maxRetries = 5;
		let retries = 0;
		let errorText: string | undefined;

		while (!errorText) {
			try {
				const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
					workflowId,
				]);
				if (execution && EXECUTION_FINISHED_STATUSES.includes(execution.status)) {
					errorText = this.getErrorMessage(execution);
					break;
				}
			} catch (error) {
				this.logger.debug(
					`Failed to fetch execution ${executionId} for error extraction: ${String(error)}`,
				);
			}

			retries++;

			if (maxRetries <= retries) {
				break;
			}

			// Wait with exponential backoff (double wait time, cap at 2 second)
			await sleep(Math.min(500 * Math.pow(2, retries), 2000));
		}

		return errorText;
	}

	getErrorMessage(execution: IExecutionResponse): string | undefined {
		if (execution.data.resultData.error) {
			return execution.data.resultData.error.description ?? execution.data.resultData.error.message;
		}

		return undefined;
	}

	getAIOutput(execution: IExecutionResponse, nodeName: string): string | undefined {
		const agent = execution.data.resultData.runData[nodeName];
		if (!agent || !Array.isArray(agent) || agent.length === 0) return undefined;

		const runIndex = agent.length - 1;
		const mainOutputs = agent[runIndex].data?.main;

		// Check all main output branches for a message
		if (mainOutputs && Array.isArray(mainOutputs)) {
			for (const branch of mainOutputs) {
				if (branch && Array.isArray(branch) && branch.length > 0 && branch[0].json?.output) {
					if (typeof branch[0].json.output === 'string') {
						return branch[0].json.output;
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * Returns the message from the last executed node
	 */
	private getMessageFromExecution(
		execution: IExecutionResponse,
		responseMode: ChatTriggerResponseMode,
	) {
		const nodeName = this.getLastNodeExecutedName(execution);
		if (!nodeName) return undefined;

		const outputs = this.getNodeOutputs(execution, nodeName);
		const entry = this.getFirstOutputEntry(outputs);
		if (!entry) return undefined;

		const message = this.extractMessageFromEntry(entry, responseMode);
		if (typeof message === 'object' && message !== null) {
			return jsonStringify(message);
		}

		return message;
	}

	private getLastNodeExecutedName(execution: IExecutionResponse): string | undefined {
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		return typeof lastNodeExecuted === 'string' ? lastNodeExecuted : undefined;
	}

	private getNodeOutputs(execution: IExecutionResponse, nodeName: string) {
		const runData = execution.data.resultData.runData[nodeName];
		if (!runData || runData.length === 0) return [];
		const runIndex = runData.length - 1;
		const data = runData[runIndex]?.data;

		return data?.main ?? data?.[NodeConnectionTypes.AiTool] ?? [];
	}

	private getFirstOutputEntry(
		outputs: Array<INodeExecutionData[] | null>,
	): INodeExecutionData | undefined {
		for (const branch of outputs) {
			if (!Array.isArray(branch) || branch.length === 0) continue;

			return branch[0];
		}

		return undefined;
	}

	private extractMessageFromEntry(
		entry: INodeExecutionData,
		responseMode: ChatTriggerResponseMode,
	) {
		if (responseMode === 'responseNodes') {
			return entry.sendMessage ?? '';
		}

		if (responseMode === 'lastNode') {
			const response: Record<string, unknown> = entry.json ?? {};
			const message = response.output ?? response.text ?? response.message ?? '';
			return typeof message === 'string' ? message : jsonStringify(message);
		}

		return undefined;
	}

	/**
	 * Create a Response-like object that routes streaming data to ChatStreamService via aggregator
	 * Returns both the adapter and a function to wait for all pending operations to complete
	 */
	private createStreamAdapter(aggregator: ReturnType<typeof createStructuredChunkAggregator>): {
		adapter: Response;
		waitForPendingOperations: () => Promise<void>;
	} {
		// Chain for sequential processing of chunks to avoid race conditions
		// Each chunk must complete before the next one starts (e.g., 'begin' must finish
		// setting up the message before 'item' or 'end' tries to use it)
		let processingChain = Promise.resolve();

		// Create a minimal Response-like object
		const adapter = {
			headersSent: false,
			writableEnded: false,

			writeHead: (_statusCode: number, _headers?: Record<string, string>) => {
				adapter.headersSent = true;
				return adapter;
			},

			flushHeaders: () => {},

			write: (chunk: string | Buffer, _encoding?: BufferEncoding, doneCb?: () => void) => {
				const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;

				// Process each line (JSONL format) through the aggregator
				const lines = text.split('\n').filter((line) => line.trim());
				for (const line of lines) {
					try {
						const parsed = jsonParse<StructuredChunk>(line.trim());
						// Chain the ingest calls to ensure sequential processing
						// This prevents race conditions where 'item' arrives before 'begin' finishes
						processingChain = processingChain.then(async () => {
							await aggregator.ingest(parsed);
						});
					} catch {
						// Not valid JSON, ignore
					}
				}

				if (doneCb) doneCb();
				return true;
			},

			end: (_chunk?: unknown, _encoding?: BufferEncoding, doneCb?: () => void) => {
				adapter.writableEnded = true;
				if (doneCb) doneCb();
				return adapter;
			},

			flush: () => {},

			on: (_event: string, _handler: (...args: unknown[]) => void) => adapter,
			once: (_event: string, _handler: (...args: unknown[]) => void) => adapter,
			emit: (_event: string, ..._args: unknown[]) => true,
		};

		const waitForPendingOperations = async () => {
			await processingChain;
		};

		return { adapter: adapter as unknown as Response, waitForPendingOperations };
	}
}
