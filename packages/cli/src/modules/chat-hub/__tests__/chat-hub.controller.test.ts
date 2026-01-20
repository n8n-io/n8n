import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { ChatHubController } from '../chat-hub.controller';
import type { ChatHubService } from '../chat-hub.service';
import type { ChatHubModelsService } from '../chat-hub.models.service';
import type { ChatHubAgentService } from '../chat-hub-agent.service';
import type { ChatHubAttachmentService } from '../chat-hub.attachment.service';

describe('ChatHubController', () => {
	let controller: ChatHubController;
	let mockAuthService: jest.Mocked<AuthService>;
	let mockChatService: jest.Mocked<ChatHubService>;
	let mockModelsService: jest.Mocked<ChatHubModelsService>;
	let mockAgentService: jest.Mocked<ChatHubAgentService>;
	let mockAttachmentService: jest.Mocked<ChatHubAttachmentService>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockAuthService = mock<AuthService>();
		mockChatService = mock<ChatHubService>();
		mockModelsService = mock<ChatHubModelsService>();
		mockAgentService = mock<ChatHubAgentService>();
		mockAttachmentService = mock<ChatHubAttachmentService>();
		mockLogger = mock<Logger>();

		controller = new ChatHubController(
			mockChatService,
			mockModelsService,
			mockAgentService,
			mockAttachmentService,
			mockLogger,
			mockAuthService,
		);
	});

	describe('extractAuthenticationMetadata', () => {
		it('should extract authToken and browserId', () => {
			mockAuthService.getCookieToken.mockReturnValue('token-123');
			mockAuthService.getBrowserIdIfApplicable.mockReturnValue('browser-456');

			const req = mock<AuthenticatedRequest>();
			const result = controller['extractAuthenticationMetadata'](req);

			expect(mockAuthService.getCookieToken).toHaveBeenCalledWith(req);
			expect(mockAuthService.getBrowserIdIfApplicable).toHaveBeenCalledWith(req);
			expect(result).toEqual({
				authToken: 'token-123',
				browserId: 'browser-456',
			});
		});

		it('should handle missing browserId', () => {
			mockAuthService.getCookieToken.mockReturnValue('token-123');
			mockAuthService.getBrowserIdIfApplicable.mockReturnValue(undefined);

			const req = mock<AuthenticatedRequest>();
			const result = controller['extractAuthenticationMetadata'](req);

			expect(result).toEqual({
				authToken: 'token-123',
				browserId: undefined,
			});
		});

		it('should throw UnauthenticatedError when authToken is missing', () => {
			mockAuthService.getCookieToken.mockReturnValue(undefined);

			const req = mock<AuthenticatedRequest>();

			expect(() => controller['extractAuthenticationMetadata'](req)).toThrow(UnauthenticatedError);
			expect(() => controller['extractAuthenticationMetadata'](req)).toThrow(
				'No authentication token found',
			);
		});

		it('should throw UnauthenticatedError when authToken is empty string', () => {
			mockAuthService.getCookieToken.mockReturnValue('');

			const req = mock<AuthenticatedRequest>();

			expect(() => controller['extractAuthenticationMetadata'](req)).toThrow(UnauthenticatedError);
		});

		it('should not call getBrowserIdIfApplicable when authToken is missing', () => {
			mockAuthService.getCookieToken.mockReturnValue(undefined);

			const req = mock<AuthenticatedRequest>();

			expect(() => controller['extractAuthenticationMetadata'](req)).toThrow(UnauthenticatedError);
			expect(mockAuthService.getBrowserIdIfApplicable).not.toHaveBeenCalled();
		});
	});
});
