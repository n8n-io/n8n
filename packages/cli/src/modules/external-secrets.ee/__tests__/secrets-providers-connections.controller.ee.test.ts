import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { SecretsProvidersConnectionsService } from '../secrets-providers-connections.service.ee';
import { SecretProvidersConnectionsController } from '../secrets-providers-connections.controller.ee';
import { ExternalSecretsConfig } from '../external-secrets.config';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import * as responseHelper from '@/response-helper';

jest.mock('@/response-helper', () => ({
	sendErrorResponse: jest.fn(),
}));

describe('SecretProvidersConnectionsController', () => {
	let controller: SecretProvidersConnectionsController;
	let config: ExternalSecretsConfig;
	let logger: Logger;
	let connectionsService: SecretsProvidersConnectionsService;

	const createMockRequest = (overrides?: Partial<Request>): Request =>
		({
			method: 'GET',
			body: {},
			...overrides,
		}) as Request;

	const createMockResponse = (): Response => {
		const res = mock<Response>();
		(res.status as any) = jest.fn().mockReturnThis();
		(res.json as any) = jest.fn().mockReturnThis();
		(res.send as any) = jest.fn().mockReturnThis();
		return res;
	};

	const createMockNextFunction = (): NextFunction => jest.fn() as NextFunction;

	beforeEach(() => {
		jest.clearAllMocks();

		config = new ExternalSecretsConfig();
		logger = mock<Logger>();
		logger.scoped = jest.fn().mockReturnValue(logger);
		logger.warn = jest.fn();

		connectionsService = mock<SecretsProvidersConnectionsService>();

		controller = new SecretProvidersConnectionsController(config, logger, connectionsService);
	});

	describe('checkFeatureFlag middleware', () => {
		describe('when both feature flags are disabled', () => {
			beforeEach(() => {
				config.externalSecretsForProjects = false;
				config.externalSecretsMultipleConnections = false;
			});

			it('should block any request', () => {
				const req = createMockRequest({ method: 'GET' });
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(responseHelper.sendErrorResponse).toHaveBeenCalledWith(
					res,
					expect.any(ForbiddenError),
				);
				expect(next).not.toHaveBeenCalled();
			});
		});

		describe('when only externalSecretsForProjects is enabled', () => {
			beforeEach(() => {
				config.externalSecretsForProjects = true;
				config.externalSecretsMultipleConnections = false;
			});

			it('should allow all requests', () => {
				const req = createMockRequest({ method: 'GET' });
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).not.toHaveBeenCalled();
				expect(responseHelper.sendErrorResponse).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalled();
			});

			it('should allow POST requests with projectIds', () => {
				const req = createMockRequest({
					method: 'POST',
					body: { projectIds: ['project-1'] },
				});
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).not.toHaveBeenCalled();
				expect(responseHelper.sendErrorResponse).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalled();
			});
		});

		describe('when only externalSecretsMultipleConnections is enabled', () => {
			beforeEach(() => {
				config.externalSecretsForProjects = false;
				config.externalSecretsMultipleConnections = true;
			});

			it('should allow POST requests without projectIds', () => {
				const req = createMockRequest({ method: 'POST', body: { projectIds: [] } });
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).not.toHaveBeenCalled();
				expect(responseHelper.sendErrorResponse).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalled();
			});

			it('should block POST requests with projectIds (requires externalSecretsForProjects)', () => {
				const req = createMockRequest({
					method: 'POST',
					body: { projectIds: ['project-1'] },
				});
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).toHaveBeenCalledWith(
					'Tried to create a project-scoped external secret connection without feature flag enabled',
				);
				expect(responseHelper.sendErrorResponse).toHaveBeenCalledWith(
					res,
					expect.any(ForbiddenError),
				);
				expect(next).not.toHaveBeenCalled();
			});

			it('should block PATCH requests with projectIds (requires externalSecretsForProjects)', () => {
				const req = createMockRequest({
					method: 'PATCH',
					body: { projectIds: ['project-1'] },
				});
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).toHaveBeenCalledWith(
					'Tried to create a project-scoped external secret connection without feature flag enabled',
				);
				expect(responseHelper.sendErrorResponse).toHaveBeenCalledWith(
					res,
					expect.any(ForbiddenError),
				);
				expect(next).not.toHaveBeenCalled();
			});
		});

		describe('when both feature flags are enabled', () => {
			beforeEach(() => {
				config.externalSecretsForProjects = true;
				config.externalSecretsMultipleConnections = true;
			});

			it('should allow all requests', () => {
				const req = createMockRequest({ method: 'GET' });
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).not.toHaveBeenCalled();
				expect(responseHelper.sendErrorResponse).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalled();
			});

			it('should allow POST requests with projectIds', () => {
				const req = createMockRequest({
					method: 'POST',
					body: { projectIds: ['project-1', 'project-2'] },
				});
				const res = createMockResponse();
				const next = createMockNextFunction();

				controller.checkFeatureFlag(req, res, next);

				expect(logger.warn).not.toHaveBeenCalled();
				expect(responseHelper.sendErrorResponse).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalled();
			});
		});
	});
});
