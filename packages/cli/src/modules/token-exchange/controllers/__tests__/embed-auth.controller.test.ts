import { EmbedLoginBodyDto, EmbedLoginQueryDto } from '@n8n/api-types';
import { GLOBAL_MEMBER_ROLE, type User } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import type { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import { EmbedAuthController } from '../embed-auth.controller';
import type { TokenExchangeService } from '../../services/token-exchange.service';
import type { TokenExchangeConfig } from '../../token-exchange.config';

const config = mock<TokenExchangeConfig>({ embedEnabled: true });
const tokenExchangeService = mock<TokenExchangeService>();
const authService = mock<AuthService>();
const urlService = mock<UrlService>();
const eventService = mock<EventService>();

const controller = new EmbedAuthController(
	config,
	tokenExchangeService,
	authService,
	urlService,
	eventService,
);

const mockUser = mock<User>({
	id: '123',
	email: 'user@example.com',
	role: GLOBAL_MEMBER_ROLE,
});

const embedLoginResult = {
	user: mockUser,
	subject: 'ext-sub-1',
	issuer: 'https://issuer.example.com',
	kid: 'key-id-1',
};

describe('EmbedAuthController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		config.embedEnabled = true;
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	describe('when disabled', () => {
		it('should return 501 for GET and POST when embedEnabled is false', async () => {
			config.embedEnabled = false;
			const req = mock<AuthlessRequest>();
			const res = mock<Response>();
			res.status.mockReturnThis();

			await controller.getLogin(req, res, new EmbedLoginQueryDto({ token: 'any' }));

			expect(res.status).toHaveBeenCalledWith(501);
			expect(res.json).toHaveBeenCalledWith({
				error: 'server_error',
				error_description: 'Embed login is not enabled on this instance',
			});
			expect(tokenExchangeService.embedLogin).not.toHaveBeenCalled();

			jest.clearAllMocks();
			res.status.mockReturnThis();

			await controller.postLogin(req, res, new EmbedLoginBodyDto({ token: 'any' }));

			expect(res.status).toHaveBeenCalledWith(501);
			expect(tokenExchangeService.embedLogin).not.toHaveBeenCalled();
		});
	});

	describe('GET /auth/embed', () => {
		it('should login, issue cookie with embed overrides, emit audit event, and redirect', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-123', ip: '192.168.1.1' });
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'subject-token' });
			tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

			await controller.getLogin(req, res, query);

			expect(tokenExchangeService.embedLogin).toHaveBeenCalledWith('subject-token');
			expect(authService.issueCookie).toHaveBeenCalledWith(
				res,
				mockUser,
				true,
				'browser-id-123',
				true,
				{
					sameSite: 'none',
					secure: true,
				},
			);
			expect(eventService.emit).toHaveBeenCalledWith('embed-login', {
				subject: 'ext-sub-1',
				issuer: 'https://issuer.example.com',
				kid: 'key-id-1',
				clientIp: '192.168.1.1',
			});
			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
		});
	});

	describe('POST /auth/embed', () => {
		it('should login, issue cookie with embed overrides, emit audit event, and redirect', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-456', ip: '10.0.0.1' });
			const res = mock<Response>();
			const body = new EmbedLoginBodyDto({ token: 'subject-token' });
			tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

			await controller.postLogin(req, res, body);

			expect(tokenExchangeService.embedLogin).toHaveBeenCalledWith('subject-token');
			expect(authService.issueCookie).toHaveBeenCalledWith(
				res,
				mockUser,
				true,
				'browser-id-456',
				true,
				{
					sameSite: 'none',
					secure: true,
				},
			);
			expect(eventService.emit).toHaveBeenCalledWith('embed-login', {
				subject: 'ext-sub-1',
				issuer: 'https://issuer.example.com',
				kid: 'key-id-1',
				clientIp: '10.0.0.1',
			});
			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
		});
	});

	describe('redirect parameter', () => {
		it('should redirect to the specified local path via GET', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-123' });
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'subject-token', redirectTo: '/workflow/123' });
			tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

			await controller.getLogin(req, res, query);

			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/workflow/123');
		});

		it('should redirect to the specified local path via POST', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-456' });
			const res = mock<Response>();
			const body = new EmbedLoginBodyDto({ token: 'subject-token', redirectTo: '/credentials' });
			tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

			await controller.postLogin(req, res, body);

			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/credentials');
		});

		it.each([['https://evil.com/phishing'], ['//evil.com/phishing'], ['javascript:alert(1)']])(
			'should reject external redirect %s and default to /',
			async (maliciousUrl) => {
				const req = mock<AuthlessRequest>({ browserId: 'browser-id-123' });
				const res = mock<Response>();
				const query = new EmbedLoginQueryDto({ token: 'subject-token', redirectTo: maliciousUrl });
				tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

				await controller.getLogin(req, res, query);

				expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
			},
		);

		it('should default to / when redirect is empty', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-123' });
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'subject-token', redirectTo: '' });
			tokenExchangeService.embedLogin.mockResolvedValue(embedLoginResult);

			await controller.getLogin(req, res, query);

			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
		});
	});

	describe('error propagation', () => {
		it('should not emit audit event or issue cookie on failure', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'browser-id-789' });
			const res = mock<Response>();
			const query = new EmbedLoginQueryDto({ token: 'bad-token' });
			tokenExchangeService.embedLogin.mockRejectedValue(new Error('Token verification failed'));

			await expect(controller.getLogin(req, res, query)).rejects.toThrow(
				'Token verification failed',
			);
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});
	});
});
