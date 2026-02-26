import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { Request } from 'express';
import crypto from 'node:crypto';

import type { WorkflowRepository } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

import { SlackAuthService } from '../slack-auth.service';

const signingSecret = 'test-signing-secret-abc123';

function createTimestamp(): string {
	return String(Math.floor(Date.now() / 1000));
}

function createSlackBody(overrides?: Record<string, string>): Record<string, string> {
	return {
		token: '5YVrvec1AlN4osaQq6o23ojI',
		team_id: 'TG9695PUK',
		team_domain: 'n8nio',
		channel_id: 'D0A2DDSREKY',
		channel_name: 'directmessage',
		user_id: 'U0A293J0RFV',
		user_name: 'phyllis.noester',
		command: '/authorize',
		text: '',
		...overrides,
	};
}

function createSignature(secret: string, timestamp: string, body: Record<string, string>): string {
	const rawBody = new URLSearchParams(body).toString();
	const basestring = `v0:${timestamp}:${rawBody}`;
	return 'v0=' + crypto.createHmac('sha256', secret).update(basestring).digest('hex');
}

function createSlackRequest(
	body?: Record<string, string>,
	headerOverrides?: Record<string, string>,
): Request {
	const slackBody = body ?? createSlackBody();
	const timestamp = createTimestamp();
	const signature = createSignature(signingSecret, timestamp, slackBody);

	return mock<Request>({
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'x-slack-request-timestamp': timestamp,
			'x-slack-signature': signature,
			...headerOverrides,
		},
		body: slackBody,
	});
}

function createWorkflowWithSlackHook(secret: string = signingSecret): IWorkflowBase {
	return {
		id: 'workflow-1',
		name: 'Test Workflow',
		active: true,
		nodes: [
			{
				id: 'node-1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					executionsHooksVersion: 1,
					contextEstablishmentHooks: {
						hooks: [
							{
								hookName: 'SlackRequestExtractor',
								signingSecret: secret,
								isAllowedToFail: false,
							},
						],
					},
				},
			},
		],
		connections: {},
	} as unknown as IWorkflowBase;
}

describe('SlackAuthService', () => {
	let service: SlackAuthService;
	let mockWorkflowRepository: jest.Mocked<WorkflowRepository>;
	const logger = mockLogger();

	beforeEach(() => {
		jest.clearAllMocks();
		mockWorkflowRepository = mock<WorkflowRepository>();
		service = new SlackAuthService(mockWorkflowRepository, logger);
	});

	describe('buildSlackCredentialContext', () => {
		it('should return credential context for valid Slack request', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = createSlackRequest();
			const result = await service.buildSlackCredentialContext(req, 'workflow-1');

			expect(result).toEqual({
				identity: 'U0A293J0RFV',
				version: 1,
				metadata: {
					source: 'slack-request',
					teamId: 'TG9695PUK',
				},
			});
		});

		it('should omit teamId from metadata when not present in body', async () => {
			const body = createSlackBody();
			delete (body as Record<string, string | undefined>).team_id;

			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = createSlackRequest(body);
			const result = await service.buildSlackCredentialContext(req, 'workflow-1');

			expect(result.metadata).toEqual({ source: 'slack-request' });
		});

		it('should throw when workflow is not found', async () => {
			mockWorkflowRepository.get.mockResolvedValue(null as ReturnType<WorkflowRepository['get']>);

			const req = createSlackRequest();
			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Workflow not found',
			);
		});

		it('should throw when workflow has no SlackRequestExtractor hook', async () => {
			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Test',
				active: true,
				nodes: [
					{
						id: 'node-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			} as ReturnType<WorkflowRepository['get']>);

			const req = createSlackRequest();
			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'No SlackRequestExtractor hook with signing secret found in workflow',
			);
		});

		it('should throw when x-slack-request-timestamp header is missing', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = mock<Request>({
				headers: { 'x-slack-signature': 'v0=abc' },
				body: createSlackBody(),
			});

			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Missing x-slack-request-timestamp header',
			);
		});

		it('should throw when x-slack-signature header is missing', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = mock<Request>({
				headers: { 'x-slack-request-timestamp': createTimestamp() },
				body: createSlackBody(),
			});

			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Missing x-slack-signature header',
			);
		});

		it('should throw when request body is missing', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = mock<Request>({
				headers: {
					'x-slack-request-timestamp': createTimestamp(),
					'x-slack-signature': 'v0=abc',
				},
				body: undefined,
			});

			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Request body is required for Slack authentication',
			);
		});

		it('should throw when signature verification fails', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const body = createSlackBody();
			const req = mock<Request>({
				headers: {
					'x-slack-request-timestamp': createTimestamp(),
					'x-slack-signature': 'v0=invalid_signature',
				},
				body,
			});

			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Slack request signature verification failed',
			);
		});

		it('should throw when user_id is missing from body', async () => {
			const body = createSlackBody();
			delete (body as Record<string, string | undefined>).user_id;

			mockWorkflowRepository.get.mockResolvedValue(
				createWorkflowWithSlackHook() as ReturnType<WorkflowRepository['get']>,
			);

			const req = createSlackRequest(body);
			await expect(service.buildSlackCredentialContext(req, 'workflow-1')).rejects.toThrow(
				'Missing user_id in Slack request body',
			);
		});
	});
});
