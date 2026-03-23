import type { InstanceSettings } from 'n8n-core';
import type { CommunityNodeType } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { CommunityPackagesController } from '@/modules/community-packages/community-packages.controller';
import type { NodeRequest } from '@/requests';

import type { EventService } from '../../../events/event.service';
import type { Push } from '../../../push';
import type { CommunityNodeTypesService } from '../community-node-types.service';
import type { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';

describe('CommunityPackagesController', () => {
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const instanceSettings = mock<InstanceSettings>();
	(instanceSettings as any).nodesDownloadDir = '/tmp/n8n-nodes-download';

	const controller = new CommunityPackagesController(
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		instanceSettings,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		communityPackagesService.toPublicInstalledPackage.mockImplementation((pkg) => pkg as never);
	});

	describe('installPackage', () => {
		it('should throw error if verify in options but no checksum', async () => {
			const request = mock<NodeRequest.Post>({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
			});
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
			});
			communityNodeTypesService.findVetted.mockReturnValue(undefined);
			await expect(controller.installPackage(request)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});

		it.each(['^1.0.0', 'file:./package.tgz', 'npm:other-package@1.0.0'])(
			'should throw error if version is invalid',
			async (version) => {
				const request = mock<NodeRequest.Post>({
					user: { id: 'user123' },
					body: { name: 'n8n-nodes-test', verify: false, version },
				});
				communityPackagesService.parseNpmPackageName.mockReturnValue({
					rawString: 'n8n-nodes-test',
					packageName: 'n8n-nodes-test',
				});
				communityPackagesService.checkNpmPackageStatus.mockResolvedValue({
					status: 'OK',
				});
				communityPackagesService.parsePackageVersion.mockImplementation(() => {
					throw new Error(`Invalid version: ${version}`);
				});
				await expect(controller.installPackage(request)).rejects.toThrow(
					`Invalid version: ${version}`,
				);
			},
		);

		it('should have correct version', async () => {
			const request = mock<NodeRequest.Post>({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
			});
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
			communityPackagesService.parsePackageVersion.mockReturnValue({
				version: '1.0.0',
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

			await controller.installPackage(request);

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

	describe('updatePackage', () => {
		it('should use the version from the request body when updating a package', async () => {
			const req = mock<NodeRequest.Update>({
				body: {
					name: 'n8n-nodes-test',
					version: '2.0.0',
					checksum: 'a893hfdsy7399',
				},
				user: { id: 'user1' },
			});

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
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
			});
			communityPackagesService.parsePackageVersion.mockReturnValue({ version: '2.0.0' });
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			communityPackagesService.toPublicInstalledPackage.mockReturnValue(
				newInstalledPackage as never,
			);

			const result = await controller.updatePackage(req);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'a893hfdsy7399',
			);

			expect(result).toBe(newInstalledPackage);
		});

		it.each(['^1.0.0', 'file:./package.tgz', 'npm:other-package@1.0.0'])(
			'should throw error if version is invalid',
			async (version) => {
				const req = mock<NodeRequest.Update>({
					body: { name: 'n8n-nodes-test', version, checksum: 'a893hfdsy7399' },
				});
				communityPackagesService.parseNpmPackageName.mockReturnValue({
					rawString: 'n8n-nodes-test',
					packageName: 'n8n-nodes-test',
				});
				communityPackagesService.findInstalledPackage.mockResolvedValue(
					mock<InstalledPackages>({ packageName: 'n8n-nodes-test' }),
				);
				communityPackagesService.parsePackageVersion.mockImplementation(() => {
					throw new Error(`Invalid version: ${version}`);
				});
				await expect(controller.updatePackage(req)).rejects.toThrow(`Invalid version: ${version}`);
			},
		);
	});
});
