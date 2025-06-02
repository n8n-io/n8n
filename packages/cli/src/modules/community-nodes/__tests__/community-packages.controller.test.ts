import type { CommunityNodeType } from '@n8n/api-types';
import type { InstalledPackages } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { Push } from '@/push';
import type { NodeRequest } from '@/requests';

import { CommunityNodesPackagesController } from '../community-nodes-packages.controller';
import type { CommunityNodesPackagesService } from '../community-nodes-packages.service';
import type { CommunityNodesTypesService } from '../community-nodes-types.service';

describe('CommunityNodesPackagesController', () => {
	const push = mock<Push>();
	const eventService = mock<EventService>();
	const packagesService = mock<CommunityNodesPackagesService>();
	const typesService = mock<CommunityNodesTypesService>();

	const controller = new CommunityNodesPackagesController(
		push,
		eventService,
		packagesService,
		typesService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('installPackage', () => {
		it('should throw error if verify in options but no checksum', async () => {
			const request = mock<NodeRequest.Post>({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true },
			});
			typesService.findVetted.mockReturnValue(undefined);
			await expect(controller.installPackage(request)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});

		it('should have correct version', async () => {
			const request = mock<NodeRequest.Post>({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
			});
			typesService.findVetted.mockReturnValue(
				mock<CommunityNodeType>({
					checksum: 'checksum',
				}),
			);
			packagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: '1.1.1',
			});
			packagesService.isPackageInstalled.mockResolvedValue(false);
			packagesService.hasPackageLoaded.mockReturnValue(false);
			packagesService.checkNpmPackageStatus.mockResolvedValue({
				status: 'OK',
			});
			packagesService.installPackage.mockResolvedValue(
				mock<InstalledPackages>({
					installedNodes: [],
				}),
			);

			await controller.installPackage(request);

			expect(packagesService.installPackage).toHaveBeenCalledWith(
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
});
