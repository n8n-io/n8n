import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';

import { TokenExchangeConfig } from '../../token-exchange.config';
import { TokenExchangeAuthError } from '../../token-exchange.errors';
import { TokenExchangeController } from '../token-exchange.controller';
import { TOKEN_EXCHANGE_GRANT_TYPE } from '../../token-exchange.schemas';
import { TokenExchangeService } from '../../services/token-exchange.service';
import { TokenExchangeFailureReason, type IssuedTokenResult } from '../../token-exchange.types';

describe('TokenExchangeController', () => {
	mockInstance(ErrorReporter);
	mockInstance(EventService);
	mockInstance(TokenExchangeService);
	const tokenExchangeConfig = mockInstance(TokenExchangeConfig);

	const controller = Container.get(TokenExchangeController);
	const errorReporter = Container.get(ErrorReporter);
	const tokenExchangeService = Container.get(TokenExchangeService);
	const eventService = Container.get(EventService);

	let req: ReturnType<typeof mock<AuthlessRequest>>;
	let res: ReturnType<typeof mock<Response>>;

	beforeEach(() => {
		jest.resetAllMocks();
		tokenExchangeConfig.enabled = true;
		tokenExchangeConfig.maxTokenTtl = 900;
		tokenExchangeConfig.jtiCleanupIntervalSeconds = 60;
		tokenExchangeConfig.jtiCleanupBatchSize = 1000;
		req = mock<AuthlessRequest>({ ip: '127.0.0.1' });
		res = mock<Response>();
		res.status.mockReturnThis();
		res.json.mockReturnThis();
	});

	describe('POST /auth/oauth/token', () => {
		describe('feature flag', () => {
			test('returns 501 server_error when token exchange is disabled', async () => {
				tokenExchangeConfig.enabled = false;
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

			const issuedResult: IssuedTokenResult = {
				accessToken: 'eyJhbGciOiJIUzI1NiJ9.issued.token',
				expiresIn: 900,
				subject: 'user-123',
				subjectUserId: 'user-id-123',
				issuer: 'https://idp.example.com',
				actor: undefined,
			};

			test('returns RFC 8693 success response with issued token', async () => {
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(issuedResult);

				await controller.exchangeToken(req, res);

				expect(res.json).toHaveBeenCalledWith({
					access_token: issuedResult.accessToken,
					token_type: 'Bearer',
					expires_in: issuedResult.expiresIn,
					issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
				});
				expect(res.status).not.toHaveBeenCalled();
			});

			test('response includes all required RFC 8693 fields', async () => {
				req.body = { ...validBody, scope: 'openid profile' };
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(issuedResult);

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

			test('emits token-exchange-succeeded event with subject and issuer from result', async () => {
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockResolvedValue(issuedResult);

				await controller.exchangeToken(req, res);

				expect(eventService.emit).toHaveBeenCalledWith(
					'token-exchange-succeeded',
					expect.objectContaining({
						subject: issuedResult.subject,
						issuer: issuedResult.issuer,
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

			test('returns 400 invalid_grant when service throws AuthError', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(new AuthError('Token verification failed'));

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
				expect(errorReporter.error).not.toHaveBeenCalled();
			});

			test('returns 400 invalid_request when service throws BadRequestError', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(new BadRequestError('Invalid token format'));

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ error: 'invalid_request' }),
				);
				expect(errorReporter.error).not.toHaveBeenCalled();
			});

			test('returns 500 server_error when service throws unexpected error', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(new UnexpectedError('Something broke'));

				await controller.exchangeToken(req, res);

				expect(res.status).toHaveBeenCalledWith(500);
				expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'server_error' }));
			});

			test('emits typed failure reason from TokenExchangeAuthError in token-exchange-failed event', async () => {
				req.body = validBody;
				jest
					.mocked(tokenExchangeService.exchange)
					.mockRejectedValue(
						new TokenExchangeAuthError(
							TokenExchangeFailureReason.TokenReplay,
							'Token has already been used',
						),
					);

				await controller.exchangeToken(req, res);

				expect(eventService.emit).toHaveBeenCalledWith(
					'token-exchange-failed',
					expect.objectContaining({
						subject: '',
						failureReason: TokenExchangeFailureReason.TokenReplay,
						grantType: TOKEN_EXCHANGE_GRANT_TYPE,
						clientIp: '127.0.0.1',
					}),
				);
			});

			test('reports only unexpected errors to ErrorReporter', async () => {
				const error = new UnexpectedError('Something broke');
				req.body = validBody;
				jest.mocked(tokenExchangeService.exchange).mockRejectedValue(error);

				await controller.exchangeToken(req, res);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});
	});
});
