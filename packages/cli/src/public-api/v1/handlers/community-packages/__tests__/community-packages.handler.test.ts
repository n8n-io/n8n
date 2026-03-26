import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import type { CommunityPackageRequest } from '@/public-api/types';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: unknown) =>
	(next as () => void)(),
) as unknown as middlewares.ScopeTaggedMiddleware;
jest.spyOn(middlewares, 'apiKeyHasScope').mockReturnValue(mockMiddleware);

const handler = require('../community-packages.handler');

describe('CommunityPackages Handler', () => {
	it('should register correct API key scopes', () => {
		expect(middlewares.apiKeyHasScope).toHaveBeenCalledWith('communityPackage:install');
		expect(middlewares.apiKeyHasScope).toHaveBeenCalledWith('communityPackage:list');
		expect(middlewares.apiKeyHasScope).toHaveBeenCalledWith('communityPackage:update');
		expect(middlewares.apiKeyHasScope).toHaveBeenCalledWith('communityPackage:uninstall');
	});

	let mockLifecycle: jest.Mocked<CommunityPackagesLifecycleService>;
	let mockResponse: Partial<Response>;

	const mockUser = { id: 'test-user-id', role: { slug: 'global:owner' } };

	const mockInstalledPackage = {
		packageName: 'n8n-nodes-test',
		installedVersion: '1.0.0',
		authorName: 'Test Author',
		authorEmail: 'test@example.com',
		installedNodes: [{ name: 'TestNode', type: 'n8n-nodes-test.testNode', latestVersion: 1 }],
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockLifecycle = mockInstance(CommunityPackagesLifecycleService);

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === CommunityPackagesLifecycleService) return mockLifecycle as never;
			return {} as never;
		});

		mockResponse = {
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};
	});

	describe('installPackage', () => {
		it('should install a package successfully', async () => {
			const req = {
				body: { name: 'n8n-nodes-test' },
				user: mockUser,
			} as unknown as CommunityPackageRequest.Install;

			mockLifecycle.installWithSideEffects.mockResolvedValue(mockInstalledPackage as never);

			const handlerFn = handler.installPackage[handler.installPackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockLifecycle.installWithSideEffects).toHaveBeenCalledWith(
				{ name: 'n8n-nodes-test', version: undefined, verify: false },
				mockUser,
				'publicApi',
			);
			expect(mockResponse.json).toHaveBeenCalledWith(mockInstalledPackage);
		});

		it('should return 400 when name is missing', async () => {
			const req = {
				body: {},
				user: mockUser,
			} as unknown as CommunityPackageRequest.Install;

			const { BadRequestError } = await import('@/errors/response-errors/bad-request.error');
			const { RESPONSE_ERROR_MESSAGES } = await import('@/constants');
			mockLifecycle.installWithSideEffects.mockRejectedValue(
				new BadRequestError(RESPONSE_ERROR_MESSAGES.PACKAGE_NAME_NOT_PROVIDED),
			);

			const handlerFn = handler.installPackage[handler.installPackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it('should return 400 when package is already installed', async () => {
			const req = {
				body: { name: 'n8n-nodes-test' },
				user: mockUser,
			} as unknown as CommunityPackageRequest.Install;

			const { BadRequestError } = await import('@/errors/response-errors/bad-request.error');
			mockLifecycle.installWithSideEffects.mockRejectedValue(
				new BadRequestError('Package "n8n-nodes-test" is already installed'),
			);

			const handlerFn = handler.installPackage[handler.installPackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});
	});

	describe('getInstalledPackages', () => {
		it('should return installed packages', async () => {
			const req = { user: mockUser } as unknown as CommunityPackageRequest.List;

			mockLifecycle.listInstalledPackagesHydrated.mockResolvedValue([
				mockInstalledPackage,
			] as never);

			const handlerFn = handler.getInstalledPackages[handler.getInstalledPackages.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.json).toHaveBeenCalledWith([mockInstalledPackage]);
		});

		it('should return empty array when no packages installed', async () => {
			const req = { user: mockUser } as unknown as CommunityPackageRequest.List;

			mockLifecycle.listInstalledPackagesHydrated.mockResolvedValue([]);

			const handlerFn = handler.getInstalledPackages[handler.getInstalledPackages.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.json).toHaveBeenCalledWith([]);
		});
	});

	describe('updatePackage', () => {
		it('should update a package successfully', async () => {
			const req = {
				params: { packageName: 'n8n-nodes-test' },
				body: {},
				user: mockUser,
			} as unknown as CommunityPackageRequest.Update;

			const updatedPackage = {
				...mockInstalledPackage,
				installedVersion: '2.0.0',
			};

			mockLifecycle.updateWithSideEffects.mockResolvedValue(updatedPackage as never);

			const handlerFn = handler.updatePackage[handler.updatePackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockLifecycle.updateWithSideEffects).toHaveBeenCalledWith(
				{ name: 'n8n-nodes-test', version: undefined },
				mockUser,
				'notFound',
			);
			expect(mockResponse.json).toHaveBeenCalledWith(updatedPackage);
		});

		it('should return 404 when package is not installed', async () => {
			const req = {
				params: { packageName: 'n8n-nodes-missing' },
				body: {},
				user: mockUser,
			} as unknown as CommunityPackageRequest.Update;

			const { NotFoundError } = await import('@/errors/response-errors/not-found.error');
			const { RESPONSE_ERROR_MESSAGES } = await import('@/constants');
			mockLifecycle.updateWithSideEffects.mockRejectedValue(
				new NotFoundError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED),
			);

			const handlerFn = handler.updatePackage[handler.updatePackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});
	});

	describe('uninstallPackage', () => {
		it('should uninstall a package successfully', async () => {
			const req = {
				params: { packageName: 'n8n-nodes-test' },
				user: mockUser,
			} as unknown as CommunityPackageRequest.Uninstall;

			mockLifecycle.uninstallWithSideEffects.mockResolvedValue(undefined);

			const handlerFn = handler.uninstallPackage[handler.uninstallPackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockLifecycle.uninstallWithSideEffects).toHaveBeenCalledWith(
				'n8n-nodes-test',
				mockUser,
				'notFound',
			);
			expect(mockResponse.status).toHaveBeenCalledWith(204);
		});

		it('should return 404 when package is not installed', async () => {
			const req = {
				params: { packageName: 'n8n-nodes-missing' },
				user: mockUser,
			} as unknown as CommunityPackageRequest.Uninstall;

			const { NotFoundError } = await import('@/errors/response-errors/not-found.error');
			const { RESPONSE_ERROR_MESSAGES } = await import('@/constants');
			mockLifecycle.uninstallWithSideEffects.mockRejectedValue(
				new NotFoundError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED),
			);

			const handlerFn = handler.uninstallPackage[handler.uninstallPackage.length - 1];
			await handlerFn(req, mockResponse as Response);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});
	});
});
