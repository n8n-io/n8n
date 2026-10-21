import type { ChatHubCreateToolRequest, ChatHubUpdateToolRequest } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { ModuleSettings } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { sendErrorResponse } from '@/response-helper';

import type { ChatHubToolService } from '../chat-hub-tool.service';
import { ChatHubController } from '../chat-hub.controller';

vi.mock('@/response-helper');

describe('ChatHubController', () => {
	const settingsMap = new Map<string, ModuleSettings>();
	const moduleRegistry = { settings: settingsMap } as unknown as ModuleRegistry;
	const chatToolService = mock<ChatHubToolService>();
	const controller = new ChatHubController(
		mock(),
		mock(),
		mock(),
		chatToolService,
		mock(),
		moduleRegistry,
	);

	const req = mock<Request>();
	const res = mock<Response>();
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsMap.clear();
		next = vi.fn();
	});

	describe('checkChatEnabled middleware', () => {
		it('should reject with a ForbiddenError when Chat Hub is disabled', () => {
			settingsMap.set('chat-hub', { enabled: false });

			controller.checkChatEnabled(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(sendErrorResponse).toHaveBeenCalledWith(res, expect.any(ForbiddenError));
		});

		it('should pass through when Chat Hub is enabled', () => {
			settingsMap.set('chat-hub', { enabled: true });

			controller.checkChatEnabled(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(sendErrorResponse).not.toHaveBeenCalled();
		});

		it('should reject when no cached setting exists (fail closed)', () => {
			controller.checkChatEnabled(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(sendErrorResponse).toHaveBeenCalledWith(res, expect.any(ForbiddenError));
		});
	});

	describe('tool type authorization', () => {
		const chatUserReq = mock<AuthenticatedRequest>({
			user: { id: 'chat-user', role: { slug: 'global:chatUser' } },
		});
		const memberReq = mock<AuthenticatedRequest>({
			user: { id: 'member', role: { slug: 'global:member' } },
		});

		const toolDefinition = (type: string): INode => ({
			id: '00000000-0000-4000-8000-000000000001',
			name: 'Tool',
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		const createPayload = (type: string) =>
			({ definition: toolDefinition(type) }) as ChatHubCreateToolRequest;
		const updatePayload = (type: string) =>
			({ definition: toolDefinition(type) }) as ChatHubUpdateToolRequest;

		beforeEach(() => {
			chatToolService.createTool.mockResolvedValue(mock({ definition: toolDefinition('x') }));
			chatToolService.updateTool.mockResolvedValue(mock({ definition: toolDefinition('x') }));
		});

		it.each([
			'n8n-nodes-base.executeCommandTool',
			'n8n-nodes-base.gitTool',
			'@n8n/n8n-nodes-langchain.toolCode',
			'n8n-nodes-base.messageAnAgentTool',
		])('should reject creating a %s tool for a chat user', async (type) => {
			await expect(controller.createTool(chatUserReq, res, createPayload(type))).rejects.toThrow(
				BadRequestError,
			);
			expect(chatToolService.createTool).not.toHaveBeenCalled();
		});

		it('should reject updating a tool to a blocked type for a chat user', async () => {
			await expect(
				controller.updateTool(
					chatUserReq,
					res,
					'tool-1',
					updatePayload('n8n-nodes-base.executeCommandTool'),
				),
			).rejects.toThrow(BadRequestError);
			expect(chatToolService.updateTool).not.toHaveBeenCalled();
		});

		it.each(['n8n-nodes-base.slackTool', 'n8n-nodes-base.httpRequestTool'])(
			'should allow creating a %s tool for a chat user',
			async (type) => {
				await controller.createTool(chatUserReq, res, createPayload(type));

				expect(chatToolService.createTool).toHaveBeenCalled();
			},
		);

		it('should allow creating a Code tool for a member', async () => {
			await controller.createTool(
				memberReq,
				res,
				createPayload('@n8n/n8n-nodes-langchain.toolCode'),
			);

			expect(chatToolService.createTool).toHaveBeenCalled();
		});

		it('should reject creating a Chat tool for a member', async () => {
			await expect(
				controller.createTool(memberReq, res, createPayload('@n8n/n8n-nodes-langchain.chatTool')),
			).rejects.toThrow(BadRequestError);
		});
	});
});
