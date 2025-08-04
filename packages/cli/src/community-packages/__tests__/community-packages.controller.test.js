'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const community_packages_controller_1 = require('@/community-packages/community-packages.controller');
describe('CommunityPackagesController', () => {
	const push = (0, jest_mock_extended_1.mock)();
	const communityPackagesService = (0, jest_mock_extended_1.mock)();
	const eventService = (0, jest_mock_extended_1.mock)();
	const communityNodeTypesService = (0, jest_mock_extended_1.mock)();
	const controller = new community_packages_controller_1.CommunityPackagesController(
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
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true },
			});
			communityNodeTypesService.findVetted.mockReturnValue(undefined);
			await expect(controller.installPackage(request)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});
		it('should have correct version', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user123' },
				body: { name: 'n8n-nodes-test', verify: true, version: '1.0.0' },
			});
			communityNodeTypesService.findVetted.mockReturnValue(
				(0, jest_mock_extended_1.mock)({
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
				(0, jest_mock_extended_1.mock)({
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
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					name: 'n8n-nodes-test',
					version: '2.0.0',
					checksum: 'a893hfdsy7399',
				},
				user: { id: 'user1' },
			});
			const previouslyInstalledPackage = (0, jest_mock_extended_1.mock)({
				installedNodes: [{ type: 'testNode', latestVersion: 1, name: 'testNode' }],
				installedVersion: '1.0.0',
				authorName: 'Author',
				authorEmail: 'author@example.com',
			});
			const newInstalledPackage = (0, jest_mock_extended_1.mock)({
				installedNodes: [{ type: 'testNode', latestVersion: 1, name: 'testNode' }],
				installedVersion: '2.0.0',
				authorName: 'Author',
				authorEmail: 'author@example.com',
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			const result = await controller.updatePackage(req);
			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'a893hfdsy7399',
			);
			expect(result).toBe(newInstalledPackage);
		});
	});
});
//# sourceMappingURL=community-packages.controller.test.js.map
