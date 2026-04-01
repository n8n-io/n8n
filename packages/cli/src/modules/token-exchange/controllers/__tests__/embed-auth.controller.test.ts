import { EmbedLoginBodyDto, EmbedLoginQueryDto } from '@n8n/api-types';
import { GLOBAL_MEMBER_ROLE, type User } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import { EmbedAuthController } from '../embed-auth.controller';
import type { TokenExchangeService } from '../../services/token-exchange.service';

const tokenExchangeService = mock<TokenExchangeService>();
const authService = mock<AuthService>();
const urlService = mock<UrlService>();

const controller = new EmbedAuthController(tokenExchangeService, authService, urlService);

const mockUser = mock<User>({
	id: '123',
	email: 'user@example.com',
	role: GLOBAL_MEMBER_ROLE,
});

describe('EmbedAuthController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	describe('GET /auth/embed', () => {
		it('should extract token from query, call embedLogin, issue cookie, and redirect', async () => {
			const req = mock<AuthlessRequest>({
				browserId: 'browser-id-123',
			});
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'subject-token' });
			tokenExchangeService.embedLogin.mockResolvedValue(mockUser);

			await controller.getLogin(req, res, query);

			expect(tokenExchangeService.embedLogin).toHaveBeenCalledWith('subject-token');
			expect(authService.issueCookie).toHaveBeenCalledWith(res, mockUser, true, 'browser-id-123');
			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
		});
	});

	describe('POST /auth/embed', () => {
		it('should extract token from body, call embedLogin, issue cookie, and redirect', async () => {
			const req = mock<AuthlessRequest>({
				browserId: 'browser-id-456',
			});
			const res = mock<Response>();
			const body = new EmbedLoginBodyDto({ token: 'subject-token' });
			tokenExchangeService.embedLogin.mockResolvedValue(mockUser);

			await controller.postLogin(req, res, body);

			expect(tokenExchangeService.embedLogin).toHaveBeenCalledWith('subject-token');
			expect(authService.issueCookie).toHaveBeenCalledWith(res, mockUser, true, 'browser-id-456');
			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
		});
	});

	describe('error propagation', () => {
		it('should propagate errors from TokenExchangeService', async () => {
			const req = mock<AuthlessRequest>({
				browserId: 'browser-id-789',
			});
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'bad-token' });
			tokenExchangeService.embedLogin.mockRejectedValue(new Error('Token verification failed'));

			await expect(controller.getLogin(req, res, query)).rejects.toThrow(
				'Token verification failed',
			);
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});
	});
});
