import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, type IExecutionResponse } from '@n8n/db';
import {
	OnLifecycleEvent,
	type WorkflowExecuteAfterContext,
	type WorkflowExecuteResumeContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import { ChatExecutionManager } from '@/chat/chat-execution-manager';

import {
	ChatHubExecutionStore,
	type ChatHubExecutionContext,
} from './chat-hub-execution-store.service';
import { ChatHubExecutionService } from './chat-hub-execution.service';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatStreamService } from './chat-stream.service';
import { getLastNodeExecuted, shouldResumeImmediately } from '../../chat/utils';

/**
 * Service responsible for handling execution lifecycle events for non-streaming
 * chat hub executions. This implements the event-driven architecture where:
 *
 * - workflowExecuteResume: Notifies frontend when a resumed execution starts
 * - workflowExecuteAfter: Handles all completion scenarios (success, error, waiting, auto-resume)
 */
@Service()
export class ChatHubExecutionWatcherService {
	constructor(
		private readonly logger: Logger,
		private readonly executionStore: ChatHubExecutionStore,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly chatHubExecutionService: ChatHubExecutionService,
		private readonly executionRepository: ExecutionRepository,
		private readonly chatStreamService: ChatStreamService,
		private readonly executionManager: ChatExecutionManager,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	/**
	 * Called when any execution resumes from waiting state.
	 * This catches all resume scenarios:
	 * - Auto-resume from shouldResumeImmediately()
	 * - User sending a message to a Chat node waiting for response
	 * - WaitTracker timer expiration
	 * - Sub workflow resuming parent workflow
	 * - External HITL webhooks (third party services, form submissions, approve button clicks...)
	 */
	@OnLifecycleEvent('workflowExecuteResume')
	async handleExecutionResumed(ctx: WorkflowExecuteResumeContext): Promise<void> {
		const { executionId } = ctx;

		// Check if this is a tracked chat hub execution
		const context = await this.executionStore.get(executionId);
		if (!context) return;

		if (!context.awaitingResume) return;

		this.logger.debug('Chat hub execution resumed, notifying frontend', { executionId });

		// Notify frontend that execution is running again
		await this.chatStreamService.startExecution(context.userId, context.sessionId);

		// External resume (button click, Wait node, Form, Slack HITL, etc.)
		// Create new message for the follow-up response
		if (context.createMessageOnResume) {
			const newMessageId = uuidv4();

			// Mark waiting message as success and create new message
			await this.messageRepository.updateChatMessage(context.messageId, { status: 'success' });
			await this.createNextMessage(context, newMessageId, executionId);

			// Update store with new message ID
			await this.executionStore.update(executionId, {
				previousMessageId: context.messageId,
				messageId: newMessageId,
				createMessageOnResume: false,
				awaitingResume: false,
			});

			await this.chatStreamService.startStream({
				userId: context.userId,
				sessionId: context.sessionId,
				messageId: newMessageId,
				previousMessageId: context.messageId,
				retryOfMessageId: null,
				executionId: parseInt(executionId, 10),
			});
			return;
		}

		await this.executionStore.update(executionId, { awaitingResume: false });

		await this.chatStreamService.startStream({
			userId: context.userId,
			sessionId: context.sessionId,
			messageId: context.messageId,
			previousMessageId: context.previousMessageId,
			retryOfMessageId: null,
			executionId: parseInt(executionId, 10),
		});
	}

	/**
	 * Called when any workflow execution completes.
	 * Handles all non-streaming completion scenarios:
	 * - Initial execution completion (success/error)
	 * - Waiting state with auto-resume (shouldResumeImmediately)
	 * - Waiting state for external trigger
	 * - Resumed execution completion
	 */
	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): Promise<void> {
		const { runData, executionId } = ctx;

		const context = await this.executionStore.get(executionId);
		if (!context) return; // Not a tracked chat hub execution

		this.logger.debug('Handling workflow execution completion', { executionId });

		if (!['success', 'waiting', 'canceled'].includes(runData.status)) {
			const errorMessage =
				this.chatHubExecutionService.extractErrorMessage(runData) ??
				'Failed to generate a response';
			await this.pushErrorResults(context, errorMessage);
			await this.executionStore.remove(executionId);
			return;
		}

		if (runData.status === 'canceled') {
			await this.chatStreamService.endExecution(context.userId, context.sessionId, 'cancelled');
			await this.executionStore.remove(executionId);
			return;
		}

		const message = this.chatHubExecutionService.extractMessage(runData, context.responseMode);

		if (runData.status === 'waiting') {
			await this.handleWaitingExecution(context, executionId, message);
			return;
		}

		// NOTE: This check is required because on multi-main/queue mode, the resumed execution's
		// 'workflowExecuteAfter' hook fires one more time after it should have stopped in 'waiting'
		// state on a Chat response node. On this final hook call the runData.status is 'success' even though
		// the execution isn't finished. On single-main mode this does not happen.
		if (runData.finished) {
			await this.pushFinalResults(context, message);
			await this.executionStore.remove(executionId);
		}
	}

	/**
	 * Handle execution that has entered waiting state
	 */
	private async handleWaitingExecution(
		context: ChatHubExecutionContext,
		executionId: string,
		message: string | undefined,
	): Promise<void> {
		await this.messageRepository.updateChatMessage(context.messageId, {
			content: message ?? '',
			status: 'waiting',
		});

		if (message) {
			await this.chatStreamService.sendChunk(context.sessionId, context.messageId, message);
		}

		await this.chatStreamService.endStream(context.sessionId, context.messageId, 'waiting');
		await this.chatStreamService.endExecution(context.userId, context.sessionId, 'success');

		// Check if we should auto-resume (after a response was sent by Chat node)
		if (context.responseMode === 'responseNodes') {
			const execution = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			if (execution) {
				const lastNode = getLastNodeExecuted(execution);
				if (lastNode && shouldResumeImmediately(lastNode)) {
					await this.triggerAutoResume(context, execution);
					return;
				}
			}
		}

		// Not auto-resuming - mark context as pending resume from external trigger
		await this.executionStore.update(executionId, {
			awaitingResume: true,
			createMessageOnResume: true,
		});
	}

	/**
	 * Trigger auto-resume for responseNodes mode when the last node doesn't require user input
	 */
	private async triggerAutoResume(
		context: ChatHubExecutionContext,
		execution: IExecutionResponse,
	): Promise<void> {
		this.logger.debug('Triggering auto-resume of execution', { executionId: execution.id });

		// Mark current message as success (not waiting) since we're continuing
		await this.messageRepository.updateChatMessage(context.messageId, { status: 'success' });

		// Create new message for the next response
		const newMessageId = uuidv4();
		await this.createNextMessage(context, newMessageId, execution.id);

		// Update context with new message ID and mark pending resume
		await this.executionStore.update(execution.id, {
			previousMessageId: context.messageId,
			messageId: newMessageId,
			awaitingResume: true,
			createMessageOnResume: false,
		});

		// Trigger resume (non-blocking - lifecycle events will handle the rest)
		void this.executionManager.runWorkflow(execution, {
			action: 'sendMessage',
			chatInput: '', // No new human input for auto-resume
			sessionId: context.sessionId,
		});
	}

	/**
	 * Create a new AI message for the next segment of a resumed execution
	 */
	private async createNextMessage(
		context: ChatHubExecutionContext,
		messageId: string,
		executionId: string,
	): Promise<void> {
		await this.messageRepository.createChatMessage({
			id: messageId,
			sessionId: context.sessionId,
			previousMessageId: context.messageId,
			executionId: parseInt(executionId, 10),
			type: 'ai',
			name: 'AI',
			status: 'running',
			content: '',
			retryOfMessageId: null,
			...context.model,
		});
	}

	/**
	 * Push final successful results to frontend and database
	 */
	private async pushFinalResults(
		context: ChatHubExecutionContext,
		message: string | undefined,
	): Promise<void> {
		// Send final content via WebSocket
		if (message) {
			await this.chatStreamService.sendChunk(context.sessionId, context.messageId, message);
		}

		// End stream and execution
		await this.chatStreamService.endStream(context.sessionId, context.messageId, 'success');
		await this.chatStreamService.endExecution(context.userId, context.sessionId, 'success');

		// Update message in DB
		await this.messageRepository.updateChatMessage(context.messageId, {
			content: message ?? '',
			status: 'success',
		});
	}

	/**
	 * Push error results to frontend and database
	 */
	private async pushErrorResults(
		context: ChatHubExecutionContext,
		errorMessage: string,
	): Promise<void> {
		// Send error via WebSocket
		await this.chatStreamService.sendChunk(context.sessionId, context.messageId, errorMessage);

		// End stream and execution with error status
		await this.chatStreamService.endStream(context.sessionId, context.messageId, 'error');
		await this.chatStreamService.endExecution(context.userId, context.sessionId, 'error');

		// Update message in DB
		await this.messageRepository.updateChatMessage(context.messageId, {
			content: errorMessage,
			status: 'error',
		});
	}
}
