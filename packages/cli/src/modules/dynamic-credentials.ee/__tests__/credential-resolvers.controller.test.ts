import type { AuthenticatedRequest } from '@n8n/db';
import { CredentialResolverValidationError } from '@n8n/decorators';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { IdentifierValidationError } from '../credential-resolvers/identifiers/identifier-interface';
import { CredentialResolversController } from '../credential-resolvers.controller';
import { CredentialResolutionError } from '../errors/credential-resolution.error';
import { DynamicCredentialResolverNotFoundError } from '../errors/credential-resolver-not-found.error';
import type { DynamicCredentialResolverService } from '../services/credential-resolver.service';

describe('CredentialResolversController', () => {
	const service = mock<DynamicCredentialResolverService>();
	const controller = new CredentialResolversController(service);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createResolver', () => {
		it('should throw BadRequestError when service throws CredentialResolverValidationError', async () => {
			service.create.mockRejectedValue(new CredentialResolverValidationError('Invalid config'));

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError when service throws CredentialResolutionError', async () => {
			service.create.mockRejectedValue(
				new CredentialResolutionError('Failed to fetch OAuth2 metadata, status code: 404'),
			);

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError when service throws IdentifierValidationError', async () => {
			service.create.mockRejectedValue(
				new IdentifierValidationError('Failed to fetch OAuth2 metadata, status code: 404'),
			);

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(BadRequestError);
		});

		it('should preserve the error message from IdentifierValidationError', async () => {
			const errorMessage = 'Metadata does not contain an introspection endpoint';
			service.create.mockRejectedValue(new IdentifierValidationError(errorMessage));

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(errorMessage);
		});

		it('should throw InternalServerError for unknown errors', async () => {
			service.create.mockRejectedValue(new Error('unexpected'));

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(InternalServerError);
		});
	});

	describe('updateResolver', () => {
		it('should throw NotFoundError when resolver not found', async () => {
			service.update.mockRejectedValue(new DynamicCredentialResolverNotFoundError('not-found-id'));

			await expect(
				controller.updateResolver(req, res, 'not-found-id', { name: 'test' }),
			).rejects.toThrow(NotFoundError);
		});

		it('should throw BadRequestError when service throws CredentialResolverValidationError', async () => {
			service.update.mockRejectedValue(new CredentialResolverValidationError('Invalid config'));

			await expect(controller.updateResolver(req, res, 'id', { config: {} })).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw BadRequestError when service throws CredentialResolutionError', async () => {
			service.update.mockRejectedValue(
				new CredentialResolutionError('Failed to fetch OAuth2 metadata, status code: 404'),
			);

			await expect(controller.updateResolver(req, res, 'id', { config: {} })).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw BadRequestError when service throws IdentifierValidationError', async () => {
			service.update.mockRejectedValue(
				new IdentifierValidationError('Invalid OAuth2 metadata format'),
			);

			await expect(controller.updateResolver(req, res, 'id', { config: {} })).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw InternalServerError for unknown errors', async () => {
			service.update.mockRejectedValue(new Error('unexpected'));

			await expect(controller.updateResolver(req, res, 'id', { config: {} })).rejects.toThrow(
				InternalServerError,
			);
		});
	});
});
