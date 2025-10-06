import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { generateUrlSignature, prepareUrlForSigning, WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';

describe('WaitingWebhooks', () => {
	const SIGNING_SECRET = 'test-secret';
	const executionRepository = mock<ExecutionRepository>();
	const mockInstanceSettings = mock<InstanceSettings>({
		hmacSignatureSecret: SIGNING_SECRET,
	});
	const waitingWebhooks = new WaitingWebhooks(
		mock(),
		mock(),
		executionRepository,
		mock(),
		mockInstanceSettings,
	);

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

	describe('validateSignatureInRequest', () => {
		const EXAMPLE_HOST = 'example.com';
		const generateValidSignature = (host = EXAMPLE_HOST) =>
			generateUrlSignature(
				prepareUrlForSigning(new URL('/webhook/test', `http://${host}`)),
				SIGNING_SECRET,
			);

		const createMockRequest = (opts: { host?: string; signature: string }) =>
			mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=` + opts.signature,
				host: opts.host ?? EXAMPLE_HOST,
				query: { [WAITING_TOKEN_QUERY_PARAM]: opts.signature },
				headers: { host: opts.host ?? EXAMPLE_HOST },
			});

		it('should validate signature correctly', () => {
			/* Arrange */
			const signature = generateValidSignature();
			const mockReq = createMockRequest({ signature });

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should validate signature correctly when host contains a port', () => {
			/* Arrange */
			const signature = generateValidSignature('example.com:8080');
			const mockReq = createMockRequest({
				signature,
				host: 'example.com:8080',
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should validate signature correctly when n8n is behind a reverse proxy', () => {
			/* Arrange */
			const signature = generateValidSignature('proxy.example.com');
			const mockReq = mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=` + signature,
				host: 'proxy.example.com',
				query: { [WAITING_TOKEN_QUERY_PARAM]: signature },
				headers: {
					host: 'localhost',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'x-forwarded-host': 'proxy.example.com',
				},
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should return false when signature is missing', () => {
			/* Arrange */
			const mockReq = mock<express.Request>({
				url: '/webhook/test',
				hostname: 'example.com',
				query: {},
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});

		it('should return false when signature is empty', () => {
			/* Arrange */
			const mockReq = mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=`,
				hostname: 'example.com',
				query: { [WAITING_TOKEN_QUERY_PARAM]: '' },
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});

		it('should return false when signatures do not match', () => {
			/* Arrange */
			const wrongSignature = 'wrong-signature';
			const mockReq = createMockRequest({ signature: wrongSignature });

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});
	});
});
