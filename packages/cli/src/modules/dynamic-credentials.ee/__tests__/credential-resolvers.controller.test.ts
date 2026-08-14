import type { AuthenticatedRequest } from '@n8n/db';
import { CredentialResolverValidationError } from '@n8n/decorators';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { SYSTEM_RESOLVER_ID } from '../constants';
import { IdentifierValidationError } from '../credential-resolvers/identifiers/identifier-interface';
import { CredentialResolversController } from '../credential-resolvers.controller';
import type { DynamicCredentialResolver } from '../database/entities/credential-resolver';
import { CredentialResolutionError } from '../errors/credential-resolution.error';
import { DynamicCredentialResolverNotFoundError } from '../errors/credential-resolver-not-found.error';
import { SystemResolverModificationError } from '../errors/system-resolver-modification.error';
import type { DynamicCredentialResolverService } from '../services/credential-resolver.service';

describe('CredentialResolversController', () => {
	const service = mock<DynamicCredentialResolverService>();
	const controller = new CredentialResolversController(service);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listResolvers', () => {
		const baseRow = {
			id: 'row-id',
			name: 'A',
			type: 'credential-resolver.oauth2-1.0',
			config: 'encrypted',
			decryptedConfig: {},
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		} as DynamicCredentialResolver;

		it('calls findAllPublic by default (excludes system resolver)', async () => {
			service.findAllPublic.mockResolvedValue([baseRow]);

			await controller.listResolvers(req, res, {});

			expect(service.findAllPublic).toHaveBeenCalledTimes(1);
			expect(service.findAll).not.toHaveBeenCalled();
		});

		it('calls findAll when includeSystem=true (workflow-settings dropdown)', async () => {
			service.findAll.mockResolvedValue([baseRow]);

			await controller.listResolvers(req, res, { includeSystem: true });

			expect(service.findAll).toHaveBeenCalledTimes(1);
			expect(service.findAllPublic).not.toHaveBeenCalled();
		});

		it('strips decryptedConfig and encrypted config from the response', async () => {
			service.findAllPublic.mockResolvedValue([baseRow]);

			const result = await controller.listResolvers(req, res, {});

			expect(result[0]).not.toHaveProperty('decryptedConfig');
			expect(result[0].config).toBe('');
		});
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

		it('should throw BadRequestError when service throws SystemResolverModificationError', async () => {
			service.create.mockRejectedValue(new SystemResolverModificationError('create'));

			await expect(
				controller.createResolver(req, res, { name: 'test', type: 'oauth2', config: {} }),
			).rejects.toThrow(BadRequestError);
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

		it('should throw BadRequestError when service throws SystemResolverModificationError', async () => {
			service.update.mockRejectedValue(new SystemResolverModificationError('update'));

			await expect(
				controller.updateResolver(req, res, SYSTEM_RESOLVER_ID, { name: 'tampered' }),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw InternalServerError for unknown errors', async () => {
			service.update.mockRejectedValue(new Error('unexpected'));

			await expect(controller.updateResolver(req, res, 'id', { config: {} })).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	describe('deleteResolver', () => {
		it('should throw NotFoundError when resolver not found', async () => {
			service.delete.mockRejectedValue(new DynamicCredentialResolverNotFoundError('not-found-id'));

			await expect(controller.deleteResolver(req, res, 'not-found-id')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('should throw BadRequestError when service throws SystemResolverModificationError', async () => {
			service.delete.mockRejectedValue(new SystemResolverModificationError('delete'));

			await expect(controller.deleteResolver(req, res, SYSTEM_RESOLVER_ID)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw InternalServerError for unknown errors', async () => {
			service.delete.mockRejectedValue(new Error('unexpected'));

			await expect(controller.deleteResolver(req, res, 'id')).rejects.toThrow(InternalServerError);
		});
	});
});
