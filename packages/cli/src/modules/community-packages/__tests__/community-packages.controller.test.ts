import type { CommunityNodeType } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { Push } from '@/push';
import type { NodeRequest } from '@/requests';

import type { CommunityNodeTypesService } from '../community-node-types.service';
import { CommunityPackagesController } from '../community-packages.controller';
import { CommunityPackagesLifecycleService } from '../community-packages.lifecycle.service';
import type { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';

describe('CommunityPackagesController', () => {
	const logger = mock<Logger>();
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const instanceSettings = mock<InstanceSettings>();
	(instanceSettings as any).nodesDownloadDir = '/tmp/n8n-nodes-download';

	const lifecycle = new CommunityPackagesLifecycleService(
		logger,
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		instanceSettings,
	);

	const controller = new CommunityPackagesController(lifecycle);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('installPackage', () => {
		it('should throw error if verify in options but no checksum', async () => {
			const request = mock<NodeRequest.Post>({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
			});
			communityNodeTypesService.findVetted.mockReturnValue(undefined);
			await expect(controller.installPackage(request)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});

		it.each(['foo', 'echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				const request = mock<NodeRequest.Post>({
					user: { id: 'user123' },
					body: { name: 'n8n-nodes-test', verify: true, version },
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
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});

			const result = await controller.updatePackage(req);

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
				const req = mock<NodeRequest.Update>({
					body: { name: 'n8n-nodes-test', version, checksum: 'a893hfdsy7399' },
				});
				await expect(controller.updatePackage(req)).rejects.toThrow(`Invalid version: ${version}`);
			},
		);
	});
});
