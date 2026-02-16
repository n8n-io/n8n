import {
	type ChatMessageId,
	type ChatSessionId,
	ChatHubConversationModel,
	chatHubMessageWithButtonsSchema,
} from '@n8n/api-types';
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
	StructuredChunk,
	IRunExecutionData,
	WorkflowExecuteMode,
	sleep,
	NodeConnectionTypes,
	INodeExecutionData,
	jsonStringify,
	IRun,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ChatExecutionManager } from '@/chat/chat-execution-manager';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { ChatHubExecutionStore } from './chat-hub-execution-store.service';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import {
	EXECUTION_FINISHED_STATUSES,
	EXECUTION_POLL_INTERVAL,
	SUPPORTED_RESPONSE_MODES,
} from './chat-hub.constants';
import type { NonStreamingResponseMode, ChatTriggerResponseMode } from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatStreamService } from './chat-stream.service';
import { createStructuredChunkAggregator } from './stream-capturer';

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
		private readonly chatHubExecutionStore: ChatHubExecutionStore,
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
	 * Execute a chat workflow with cleanup if necessary.
	 *
	 * For streaming mode, this waits for completion and handles cleanup.
	 * For non-streaming modes (lastNode/responseNodes), this starts the execution
	 * and returns immediately - the watcher service handles completion via lifecycle events.
	 * In this mode no cleanup happens, as temporary workflows are only created for streaming mode with non-n8n providers.
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
		const executionMode = model.provider === 'n8n' ? 'webhook' : 'chat';
		const { id: workflowId } = workflowData;

		try {
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
				await this.chatHubWorkflowService.deleteChatWorkflow(workflowId);
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
			return await this.executeNonStreaming(
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
	 * Execute a workflow for non-streaming modes (lastNode and responseNodes).
	 *
	 * This method is non-blocking - it starts the execution, registers context
	 * in the execution store, notifies the frontend, and returns immediately.
	 * The ChatHubExecutionWatcherService handles completion via lifecycle events.
	 */
	private async executeNonStreaming(
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
		// 1. Start the workflow execution
		const running = await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
			undefined,
			false,
			executionMode,
		);

		const executionId = running.executionId;
		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		const messageId = uuidv4();

		// 2. Register execution context for watcher to handle completion
		await this.chatHubExecutionStore.register({
			executionId,
			sessionId,
			userId: user.id,
			messageId,
			previousMessageId,
			model,
			responseMode,
			awaitingResume: false,
			createMessageOnResume: false,
			workflowId: workflowData.id,
		});

		// 3. Notify frontend that execution has started
		await this.chatStreamService.startExecution(user.id, sessionId);

		// 4. Create AI message in DB (running state)
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

		// 5. Send stream begin event to frontend
		await this.chatStreamService.startStream({
			userId: user.id,
			sessionId,
			messageId,
			previousMessageId,
			retryOfMessageId,
			executionId: parseInt(executionId, 10),
		});

		// 6. Return immediately - execution watcher service handles completion via listeners on
		// lifecycle events 'workflowExecuteAfter' and 'workflowExecuteResume' as needed.
	}

	/**
	 * Resume a chat execution (for responseNodes mode when execution is waiting)
	 *
	 * This is called when a user sends a message to resume a waiting execution.
	 * The ChatHubExecutionWatcherService handles completion via lifecycle events.
	 */
	async resumeChatExecution(
		execution: IExecutionResponse,
		message: string,
		sessionId: ChatSessionId,
		_user: User,
		previousMessageId: ChatMessageId,
		model: ChatHubConversationModel,
		_responseMode: 'responseNodes',
	) {
		await this.messageRepository.updateChatMessage(previousMessageId, {
			status: 'success',
		});

		// Create new message for the response
		const messageId = uuidv4();
		await this.messageRepository.createAIMessage({
			id: messageId,
			content: '',
			sessionId,
			executionId: execution.id,
			model,
			previousMessageId,
			retryOfMessageId: null,
			status: 'running',
		});

		// Mark as resuming with new message ID
		await this.chatHubExecutionStore.update(execution.id, {
			previousMessageId,
			messageId,
			awaitingResume: true,
			createMessageOnResume: false,
		});

		// Resume the execution - execution watcher handles capturing output via 'workflowExecuteResume' lifecycle event
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
					errorText = this.extractErrorMessage(execution);
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

	/**
	 * Extract error message from run data
	 */
	extractErrorMessage(runData: IRun): string | undefined {
		if (runData.data.resultData.error) {
			return runData.data.resultData.error.description ?? runData.data.resultData.error.message;
		}
		return undefined;
	}

	/**
	 * Extract message content from run data based on response mode
	 */
	extractMessage(runData: IRun, responseMode: NonStreamingResponseMode): string | undefined {
		const lastNodeExecuted = runData.data.resultData.lastNodeExecuted;
		if (typeof lastNodeExecuted !== 'string') return undefined;

		const nodeRunData = runData.data.resultData.runData[lastNodeExecuted];
		if (!nodeRunData || nodeRunData.length === 0) return undefined;

		const runIndex = nodeRunData.length - 1;
		const data = nodeRunData[runIndex]?.data;
		const outputs = data?.main ?? data?.[NodeConnectionTypes.AiTool] ?? [];

		const entry = this.getFirstOutputEntry(outputs);
		if (!entry) return undefined;

		return this.extractMessageFromEntry(entry, responseMode);
	}

	/**
	 * Get the first entry from output branches
	 */
	private getFirstOutputEntry(
		outputs: Array<INodeExecutionData[] | null>,
	): INodeExecutionData | undefined {
		for (const branch of outputs) {
			if (!Array.isArray(branch) || branch.length === 0) continue;
			return branch[0];
		}
		return undefined;
	}

	/**
	 * Extract message text from an output entry based on response mode
	 */
	private extractMessageFromEntry(
		entry: INodeExecutionData,
		responseMode: ChatTriggerResponseMode,
	): string | undefined {
		if (responseMode === 'responseNodes') {
			const sendMessage = entry.sendMessage;
			if (typeof sendMessage === 'string') {
				return sendMessage;
			}

			const result = chatHubMessageWithButtonsSchema.safeParse(sendMessage);
			if (result.success) {
				return jsonStringify(result.data);
			}
			return '';
		}

		if (responseMode === 'lastNode') {
			const response: Record<string, unknown> = entry.json ?? {};
			const message = response.output ?? response.text ?? response.message ?? '';
			return typeof message === 'string' ? message : jsonStringify(message);
		}

		return undefined;
	}
}
