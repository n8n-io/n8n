import type { CommunityNodeType } from '@n8n/api-types';
import type { InstalledPackages } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { CommunityPackagesController } from '@/controllers/community-packages.controller';
import type { NodeRequest } from '@/requests';

import type { EventService } from '../../events/event.service';
import type { Push } from '../../push';
import type { CommunityNodeTypesService } from '../../services/community-node-types.service';
import type { CommunityPackagesService } from '../../services/community-packages.service';

describe('CommunityPackagesController', () => {
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();

	const controller = new CommunityPackagesController(
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
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
			communityNodeTypesService.findVetted.mockReturnValue(undefined);
			await expect(controller.installPackage(request)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});

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
});
