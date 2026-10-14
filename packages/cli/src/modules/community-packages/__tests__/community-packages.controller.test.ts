import type { CommunityNodeType } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { CommunityPackagesController } from '@/modules/community-packages/community-packages.controller';
import type { NodeRequest } from '@/requests';

import type { EventService } from '../../../events/event.service';
import type { Push } from '../../../push';
import type { CommunityNodeTypesService } from '../community-node-types.service';
import type { CommunityPackagesConfig } from '../community-packages.config';
import type { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';

describe('CommunityPackagesController', () => {
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const communityPackagesConfig = mock<CommunityPackagesConfig>();

	const controller = new CommunityPackagesController(
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		communityPackagesConfig,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: 'user123' } });

	const vetted = mock<CommunityNodeType>({
		packageName: 'n8n-nodes-test',
		npmVersion: '2.0.0',
		checksum: 'checksum-2.0.0',
		nodeVersions: [{ npmVersion: '1.0.0', checksum: 'checksum-1.0.0' }],
	});

	const parsedAs = (packageName: string, version?: string) =>
		communityPackagesService.parseNpmPackageName.mockReturnValue({
			rawString: version ? `${packageName}@${version}` : packageName,
			packageName,
			version,
		});

	beforeEach(() => {
		jest.clearAllMocks();
		communityPackagesConfig.unverifiedEnabled = false;
		parsedAs('n8n-nodes-test');
	});

	describe('installPackage', () => {
		beforeEach(() => {
			communityPackagesService.isPackageInstalled.mockResolvedValue(false);
			communityPackagesService.hasPackageLoaded.mockReturnValue(false);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
			communityPackagesService.installPackage.mockResolvedValue(
				mock<InstalledPackages>({ installedNodes: [] }),
			);
		});

		it('should throw error if package is not vetted in verified-only mode', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);
			await expect(
				controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version: '1.0.0' }),
			).rejects.toThrow('Package n8n-nodes-test is not vetted for installation');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});

		it.each(['foo', 'echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				await expect(
					controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version }),
				).rejects.toThrow(`Invalid version: ${version}`);
			},
		);

		it('should install the requested vetted version with its checksum', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version: '1.0.0' });

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				'1.0.0',
				'checksum-1.0.0',
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'community-package-installed',
				expect.objectContaining({ packageVersion: '1.0.0' }),
			);
		});

		it('should install the latest vetted version when no version is requested', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await controller.installPackage(req, undefined, { name: 'n8n-nodes-test' });

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				'2.0.0',
				'checksum-2.0.0',
			);
		});

		it('should look up the bare package name when the name has a version suffix', async () => {
			parsedAs('@scope/n8n-nodes-test', '1.0.0');
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await controller.installPackage(req, undefined, { name: '@scope/n8n-nodes-test@1.0.0' });

			expect(communityNodeTypesService.findVetted).toHaveBeenCalledWith('@scope/n8n-nodes-test');
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'@scope/n8n-nodes-test',
				'1.0.0',
				'checksum-1.0.0',
			);
		});

		it('should reject a version that is not vetted in verified-only mode', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await expect(
				controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version: '3.0.0' }),
			).rejects.toThrow(
				'Version 3.0.0 of n8n-nodes-test is not verified by n8n. Latest verified version is 2.0.0',
			);
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});

		it('should attach the vetted checksum when unverified packages are allowed', async () => {
			communityPackagesConfig.unverifiedEnabled = true;
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version: '1.0.0' });

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				'1.0.0',
				'checksum-1.0.0',
			);
		});

		it.each([
			{ name: 'package is not vetted', found: undefined, version: '1.0.0' },
			{ name: 'version is not vetted', found: vetted, version: '3.0.0' },
			{ name: 'no version is requested', found: vetted, version: undefined },
		])(
			'should install without checksum when unverified packages are allowed and $name',
			async ({ found, version }) => {
				communityPackagesConfig.unverifiedEnabled = true;
				communityNodeTypesService.findVetted.mockResolvedValue(found);

				await controller.installPackage(req, undefined, { name: 'n8n-nodes-test', version });

				expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
					'n8n-nodes-test',
					version,
					undefined,
				);
			},
		);

		it('should reject with BadRequestError when package name parsing fails', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementationOnce(() => {
				throw new Error('Package name "n8n-nodes-invalid" is not allowed');
			});

			const promise = controller.installPackage(req, undefined, { name: 'n8n-nodes-invalid' });

			await expect(promise).rejects.toBeInstanceOf(BadRequestError);
			await expect(promise).rejects.toThrow('Package name "n8n-nodes-invalid" is not allowed');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});
	});

	describe('uninstallPackage', () => {
		it('should reject with BadRequestError when package name parsing fails', async () => {
			const request = mock<NodeRequest.Delete>({
				user: { id: 'user123' },
				query: { name: 'n8n-nodes-invalid' },
			});
			communityPackagesService.parseNpmPackageName.mockImplementationOnce(() => {
				throw new Error('Package name "n8n-nodes-invalid" is not allowed');
			});

			const promise = controller.uninstallPackage(request);

			await expect(promise).rejects.toBeInstanceOf(BadRequestError);
			await expect(promise).rejects.toThrow('Package name "n8n-nodes-invalid" is not allowed');
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});
	});

	describe('updatePackage', () => {
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

		beforeEach(() => {
			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
		});

		it('should update to the requested vetted version with its checksum', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			const result = await controller.updatePackage(req, undefined, {
				name: 'n8n-nodes-test',
				version: '1.0.0',
			});

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'1.0.0',
				'checksum-1.0.0',
			);
			expect(result).toBe(newInstalledPackage);
		});

		it('should update to the latest vetted version when no version is requested', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await controller.updatePackage(req, undefined, { name: 'n8n-nodes-test' });

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'checksum-2.0.0',
			);
		});

		it('should reject a version that is not vetted in verified-only mode', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(vetted);

			await expect(
				controller.updatePackage(req, undefined, { name: 'n8n-nodes-test', version: '3.0.0' }),
			).rejects.toThrow(
				'Version 3.0.0 of n8n-nodes-test is not verified by n8n. Latest verified version is 2.0.0',
			);
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
		});

		it('should ignore a checksum in the request body', async () => {
			communityPackagesConfig.unverifiedEnabled = true;
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);
			const body = { name: 'n8n-nodes-test', version: '2.0.0', checksum: 'a893hfdsy7399' };

			await controller.updatePackage(req, undefined, body);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				undefined,
			);
		});

		it.each(['foo', 'echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				await expect(
					controller.updatePackage(req, undefined, { name: 'n8n-nodes-test', version }),
				).rejects.toThrow(`Invalid version: ${version}`);
			},
		);
	});
});
