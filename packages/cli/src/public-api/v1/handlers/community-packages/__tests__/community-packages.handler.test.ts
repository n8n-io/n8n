import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';
import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';
import { mapToCommunityPackage, mapToCommunityPackageList } from '../community-packages.mapper';
import { mock } from 'jest-mock-extended';

const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: unknown) =>
	(next as () => void)(),
) as unknown as middlewares.ScopeTaggedMiddleware;
jest.spyOn(middlewares, 'publicApiScope').mockReturnValue(mockMiddleware);

const handler = require('../community-packages.handler');

describe('CommunityPackages Handler', () => {
	let mockLifecycle: jest.Mocked<CommunityPackagesLifecycleService>;
	let mockResponse: Partial<Response>;

	const mockUser = { id: 'test-user-id', role: { slug: 'global:owner' } };

	const mockInstalledPackage = mock<InstalledPackages>({
		packageName: 'n8n-nodes-test',
		installedVersion: '1.0.0',
		authorName: 'Test Author',
		authorEmail: 'test@example.com',
		installedNodes: [{ name: 'TestNode', type: 'n8n-nodes-test.testNode', latestVersion: 1 }],
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	beforeEach(() => {
		mockLifecycle = mockInstance(CommunityPackagesLifecycleService);

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === CommunityPackagesLifecycleService) return mockLifecycle as any;
			return {} as any;
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
			};

			mockLifecycle.install.mockResolvedValue(mockInstalledPackage as InstalledPackages);

			await handler.installPackage[handler.installPackage.length - 1](req, mockResponse);

			expect(mockLifecycle.install).toHaveBeenCalledWith(
				{ name: 'n8n-nodes-test', version: undefined, verify: true },
				mockUser,
				'publicApi',
			);
			expect(mockResponse.json).toHaveBeenCalledWith(mapToCommunityPackage(mockInstalledPackage));
		});

		it('should forward verify:false to lifecycle when explicitly provided', async () => {
			const req = {
				body: { name: 'n8n-nodes-test', verify: false },
				user: mockUser,
			};

			mockLifecycle.install.mockResolvedValue(mockInstalledPackage as InstalledPackages);

			await handler.installPackage[handler.installPackage.length - 1](req, mockResponse);

			expect(mockLifecycle.install).toHaveBeenCalledWith(
				{ name: 'n8n-nodes-test', version: undefined, verify: false },
				mockUser,
				'publicApi',
			);
		});

		it('should return 400 when name is missing', async () => {
			const req = {
				body: {},
				user: mockUser,
			};

			mockLifecycle.install.mockRejectedValue(
				new BadRequestError(RESPONSE_ERROR_MESSAGES.PACKAGE_NAME_NOT_PROVIDED),
			);

			await handler.installPackage[handler.installPackage.length - 1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it('should return 400 when package is already installed', async () => {
			const req = {
				body: { name: 'n8n-nodes-test' },
				user: mockUser,
			};

			mockLifecycle.install.mockRejectedValue(
				new BadRequestError('Package "n8n-nodes-test" is already installed'),
			);

			await handler.installPackage[handler.installPackage.length - 1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});
	});

	describe('getInstalledPackages', () => {
		it('should return installed packages', async () => {
			const req = { user: mockUser };

			mockLifecycle.listInstalledPackages.mockResolvedValue([mockInstalledPackage]);

			await handler.getInstalledPackages[handler.getInstalledPackages.length - 1](
				req,
				mockResponse,
			);

			expect(mockResponse.json).toHaveBeenCalledWith(
				mapToCommunityPackageList([mockInstalledPackage]),
			);
		});

		it('should return empty array when no packages installed', async () => {
			const req = { user: mockUser };

			mockLifecycle.listInstalledPackages.mockResolvedValue([]);

			await handler.getInstalledPackages[handler.getInstalledPackages.length - 1](
				req,
				mockResponse,
			);

			expect(mockResponse.json).toHaveBeenCalledWith([]);
		});
	});

	describe('updatePackage', () => {
		it('should update a package successfully', async () => {
			const req = {
				params: { name: 'n8n-nodes-test' },
				body: {},
				user: mockUser,
			};

			const updatedPackage = {
				...mockInstalledPackage,
				installedVersion: '2.0.0',
			};

			mockLifecycle.update.mockResolvedValue(updatedPackage);

			await handler.updatePackage[handler.updatePackage.length - 1](req, mockResponse);

			expect(mockLifecycle.update).toHaveBeenCalledWith(
				{ name: 'n8n-nodes-test', version: undefined, verify: true },
				mockUser,
				'notFound',
			);
			expect(mockResponse.json).toHaveBeenCalledWith(mapToCommunityPackage(updatedPackage));
		});

		it('should return 404 when package is not installed', async () => {
			const req = {
				params: { name: 'n8n-nodes-missing' },
				body: {},
				user: mockUser,
			};

			mockLifecycle.update.mockRejectedValue(
				new NotFoundError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED),
			);

			await handler.updatePackage[handler.updatePackage.length - 1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});
	});

	describe('uninstallPackage', () => {
		it('should uninstall a package successfully', async () => {
			const req = {
				params: { name: 'n8n-nodes-test' },
				user: mockUser,
			};

			mockLifecycle.uninstall.mockResolvedValue(undefined);

			await handler.uninstallPackage[handler.uninstallPackage.length - 1](req, mockResponse);

			expect(mockLifecycle.uninstall).toHaveBeenCalledWith('n8n-nodes-test', mockUser, 'notFound');
			expect(mockResponse.status).toHaveBeenCalledWith(204);
		});

		it('should return 404 when package is not installed', async () => {
			const req = {
				params: { name: 'n8n-nodes-missing' },
				user: mockUser,
			};

			mockLifecycle.uninstall.mockRejectedValue(
				new NotFoundError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED),
			);

			await handler.uninstallPackage[handler.uninstallPackage.length - 1](req, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});
	});
});
