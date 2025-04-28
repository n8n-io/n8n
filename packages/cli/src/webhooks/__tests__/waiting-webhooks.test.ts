import type express from 'express';
import { mock } from 'jest-mock-extended';

import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionResponse } from '@/types-db';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from '@/webhooks/webhook.types';

describe('WaitingWebhooks', () => {
	const executionRepository = mock<ExecutionRepository>();
	const waitingWebhooks = new WaitingWebhooks(mock(), mock(), executionRepository, mock());

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('should throw NotFoundError if there is no execution to resume', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(undefined);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(NotFoundError);
	});

	it('should throw ConflictError if the execution to resume is already running', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'running' }),
		);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(ConflictError);
	});

	it('should throw ConflictError if the execution to resume already finished', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ finished: true, workflowData: { nodes: [] } }),
		);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(ConflictError);
	});

	it('should mark as test webhook when execution mode is manual', async () => {
		jest
			// @ts-expect-error Protected method
			.spyOn(waitingWebhooks, 'getWebhookExecutionData')
			// @ts-expect-error Protected method
			.mockResolvedValue(mock<IWebhookResponseCallbackData>());

		const execution = mock<IExecutionResponse>({
			finished: false,
			mode: 'manual',
			data: {
				resultData: { lastNodeExecuted: 'someNode', error: undefined },
			},
		});
		executionRepository.findSingleExecution.mockResolvedValue(execution);

		await waitingWebhooks.executeWebhook(mock<WaitingWebhookRequest>(), mock<express.Response>());

		expect(execution.data.isTestWebhook).toBe(true);
	});
});
