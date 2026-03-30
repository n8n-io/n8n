import type { CommunityNodeType } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { Push } from '@/push';

import type { CommunityNodeTypesService } from '../community-node-types.service';
import { CommunityPackagesLifecycleService } from '../community-packages.lifecycle.service';
import type { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';

describe('CommunityPackagesLifecycleService', () => {
	const logger = mock<Logger>();
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const instanceSettings = mock<{ nodesDownloadDir: string }>({
		nodesDownloadDir: '/tmp/n8n-nodes-download',
	});

	const lifecycle = new CommunityPackagesLifecycleService(
		logger,
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		instanceSettings as never,
	);

	const user = { id: 'user123' };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('install', () => {
		it('should throw error if verify in options but no checksum', async () => {
			communityNodeTypesService.findVetted.mockReturnValue(undefined);

			await expect(
				lifecycle.install({ name: 'n8n-nodes-test', verify: true, version: '1.0.0' }, user, 'ui'),
			).rejects.toThrow('Package n8n-nodes-test is not vetted for installation');

			expect(communityNodeTypesService.findVetted).toHaveBeenCalledWith('n8n-nodes-test');
		});

		it.each(['foo', 'echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				await expect(
					lifecycle.install({ name: 'n8n-nodes-test', verify: true, version }, user, 'ui'),
				).rejects.toThrow(`Invalid version: ${version}`);
			},
		);

		it('should install with checksum when verify is true', async () => {
			communityNodeTypesService.findVetted.mockReturnValue(
				mock<CommunityNodeType>({
					checksum: 'checksum',
				}),
			);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: '1.1.1',
			});
			communityPackagesService.isPackageInstalled.mockResolvedValue(false);
			communityPackagesService.hasPackageLoaded.mockReturnValue(false);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({
				status: 'OK',
			});
			communityPackagesService.installPackage.mockResolvedValue(
				mock<InstalledPackages>({
					installedNodes: [],
				}),
			);

			await lifecycle.install(
				{ name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
				user,
				'ui',
			);

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				'1.0.0',
				'checksum',
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'community-package-installed',
				expect.objectContaining({
					packageVersion: '1.0.0',
				}),
			);
		});
	});

	describe('update', () => {
		it('should use the version from the request when updating a package', async () => {
			const previouslyInstalledPackage = mock<InstalledPackages>({
				installedNodes: [{ type: 'testNode', latestVersion: 1, name: 'testNode' }],
				installedVersion: '1.0.0',
				authorName: 'Author',
				authorEmail: 'author@example.com',
			});
			const newInstalledPackage = mock<InstalledPackages>({
				installedNodes: [{ type: 'testNode', latestVersion: 1, name: 'testNode' }],
				installedVersion: '2.0.0',
				authorName: 'Author',
				authorEmail: 'author@example.com',
			});

			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});

			const result = await lifecycle.update(
				{
					name: 'n8n-nodes-test',
					version: '2.0.0',
					checksum: 'a893hfdsy7399',
				},
				user,
				'badRequest',
			);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'a893hfdsy7399',
			);

			expect(result).toBe(newInstalledPackage);
		});

		it.each(['foo', 'echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				await expect(
					lifecycle.update(
						{ name: 'n8n-nodes-test', version, checksum: 'a893hfdsy7399' },
						user,
						'badRequest',
					),
				).rejects.toThrow(`Invalid version: ${version}`);
			},
		);

		it('should throw NotFoundError when package missing and whenMissing is notFound', async () => {
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			await expect(
				lifecycle.update({ name: 'n8n-nodes-missing', version: '1.0.0' }, user, 'notFound'),
			).rejects.toMatchObject({ httpStatusCode: 404 });
		});

		it('should throw BadRequestError when package missing and whenMissing is badRequest', async () => {
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			await expect(
				lifecycle.update({ name: 'n8n-nodes-missing', version: '1.0.0' }, user, 'badRequest'),
			).rejects.toBeInstanceOf(BadRequestError);
		});
	});
});
