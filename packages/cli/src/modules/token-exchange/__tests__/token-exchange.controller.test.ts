import { GlobalConfig } from '@n8n/config';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';

import { TokenExchangeController } from '../token-exchange.controller';
import { TOKEN_EXCHANGE_GRANT_TYPE } from '../token-exchange.schemas';
import { TokenExchangeService } from '../token-exchange.service';

describe('TokenExchangeController', () => {
	mockInstance(ErrorReporter);
	mockInstance(EventService);
	mockInstance(TokenExchangeService);
	const globalConfig = mockInstance(GlobalConfig);

	const controller = Container.get(TokenExchangeController);
	const errorReporter = Container.get(ErrorReporter);
	const tokenExchangeService = Container.get(TokenExchangeService);
	const eventService = Container.get(EventService);

	let req: ReturnType<typeof mock<AuthlessRequest>>;
	let res: ReturnType<typeof mock<Response>>;

	beforeEach(() => {
		jest.resetAllMocks();
		globalConfig.tokenExchange = { enabled: true };
		req = mock<AuthlessRequest>({ ip: '127.0.0.1' });
		res = mock<Response>();
		res.status.mockReturnThis();
		res.json.mockReturnThis();
	});

	describe('POST /auth/oauth/token', () => {
		describe('feature flag', () => {
			test('returns 501 server_error when token exchange is disabled', async () => {
				globalConfig.tokenExchange = { enabled: false };
				req.body = {
					grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
					subject_token: 'some-token',
				};

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(501);
				expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'server_error' }));
				expect(tokenExchangeService.exchange).not.toHaveBeenCalled();
			});
		});

		describe('grant_type validation', () => {
			test('returns 400 unsupported_grant_type when grant_type is missing', async () => {
				req.body = { subject_token: 'some-token' };

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'unsupported_grant_type' }),
				);
			});

			test('returns 400 unsupported_grant_type when grant_type is a different URN', async () => {
				req.body = {
					grant_type: 'urn:ietf:params:oauth:grant-type:client_credentials',
					subject_token: 'some-token',
				};

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'unsupported_grant_type' }),
				);
			});

			test('returns 400 unsupported_grant_type when grant_type is empty string', async () => {
				req.body = { grant_type: '', subject_token: 'some-token' };

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'unsupported_grant_type' }),
				);
			});
		});

		describe('request body validation', () => {
			test('returns 400 invalid_request when subject_token is missing', async () => {
				req.body = { grant_type: TOKEN_EXCHANGE_GRANT_TYPE };

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'invalid_request' }),
				);
			});

			test('returns 400 invalid_request when subject_token is empty string', async () => {
				req.body = { grant_type: TOKEN_EXCHANGE_GRANT_TYPE, subject_token: '' };

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'invalid_request' }),
				);
			});
		});

		describe('success path', () => {
			const validBody = {
				grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
				subject_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig',
			};

			const stubResponse = {
				access_token: 'stub-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			};

			test('returns RFC 8693 success response', async () => {
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(true);

				await controller.exchangeToken(req, res);

				expect(res.json).toHaveBeenCalledWith(stubResponse);
				expect(res.status).not.toHaveBeenCalled();
			});

			test('response includes all required RFC 8693 fields', async () => {
				req.body = { ...validBody, scope: 'openid profile' };
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(true);

				await controller.exchangeToken(req, res);

				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({
						access_token: expect.any(String),
						token_type: 'Bearer',
						expires_in: expect.any(Number),
						issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
					}),
				);
			});

			test('emits token-exchange-succeeded event on success', async () => {
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(true);

				await controller.exchangeToken(req, res);

				expect(eventService.emit).toHaveBeenCalledWith(
					'token-exchange-succeeded',
					expect.objectContaining({
						subject: '',
						grantType: TOKEN_EXCHANGE_GRANT_TYPE,
						clientIp: '127.0.0.1',
					}),
				);
			});
		});

		describe('error path', () => {
			const validBody = {
				grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
				subject_token: 'some-subject-token',
			};

			test('returns 500 server_error when service throws', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(new UnexpectedError('Token exchange not yet implemented'));

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(500);
				expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'server_error' }));
			});

			test('emits token-exchange-failed event when service throws', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(new UnexpectedError('Token exchange not yet implemented'));

				await controller.exchangeToken(req, res);

				expect(eventService.emit).toHaveBeenCalledWith(
					'token-exchange-failed',
					expect.objectContaining({
						subject: '',
						grantType: TOKEN_EXCHANGE_GRANT_TYPE,
						clientIp: '127.0.0.1',
					}),
				);
			});

			test('reports error to ErrorReporter when service throws', async () => {
				const error = new UnexpectedError('Token exchange not yet implemented');
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockRejectedValue(error);

				await controller.exchangeToken(req, res);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});
	});
});
