import type { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleSettings } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

import { ChatHubController } from '../chat-hub.controller';

vi.mock('@/response-helper');

describe('ChatHubController', () => {
	const settingsMap = new Map<string, ModuleSettings>();
	const moduleRegistry = { settings: settingsMap } as unknown as ModuleRegistry;
	const controller = new ChatHubController(mock(), mock(), mock(), mock(), mock(), moduleRegistry);

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
});
