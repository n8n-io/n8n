import type { CommunityNodeType, CommunityPackageRequestDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { EventService, InstalledTypeRestrictionsProxy } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { AuthenticatedRequest } from '@n8n/db';

import type { CommunityNodeTypesService } from '../community-node-types.service';
import type { CommunityPackagesConfig } from '../community-packages.config';
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
	const communityPackagesConfig = mock<CommunityPackagesConfig>({ unverifiedEnabled: true });
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		communityPackagesManagedByEnv: false,
	});

	const installedTypeRestrictions = mock<InstalledTypeRestrictionsProxy>();

	const lifecycle = new CommunityPackagesLifecycleService(
		logger,
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		instanceSettings,
		communityPackagesConfig,
		instanceSettingsLoaderConfig,
		installedTypeRestrictions,
	);

	const controller = new CommunityPackagesController(lifecycle);
	const req = mock<AuthenticatedRequest>({ user: { id: 'user1' } });

	beforeEach(() => {
		vi.clearAllMocks();
		communityPackagesConfig.unverifiedEnabled = true;
	});

	describe('installPackage', () => {
		it('should reject an install when unverified packages are disabled and the package is not vetted', async () => {
			communityPackagesConfig.unverifiedEnabled = false;
			const body = { name: 'n8n-nodes-test', version: '1.0.0' };
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);
			await expect(controller.installPackage(req, {}, body)).rejects.toThrow(
				'Package n8n-nodes-test is not vetted for installation',
			);
		});

		it.each(['echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				const body = { name: 'n8n-nodes-test', version };
				await expect(controller.installPackage(req, {}, body)).rejects.toThrow(
					`Invalid version: ${version}`,
				);
			},
		);

		it('should have correct version', async () => {
			communityPackagesConfig.unverifiedEnabled = false;
			const body = { name: 'n8n-nodes-test', version: '1.0.0' };
			communityNodeTypesService.findVetted.mockResolvedValue(
				mock<CommunityNodeType>({
					npmVersion: '1.1.1',
					checksum: 'latest-checksum',
					// The requested version is older than the registry's latest, so its
					// checksum must come from the per-version history.
					nodeVersions: [{ npmVersion: '1.0.0', checksum: 'checksum' }],
				}),
			);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: '1.1.1',
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({
				status: 'OK',
			});
			communityPackagesService.installPackage.mockResolvedValue(
				mock<InstalledPackages>({
					installedNodes: [],
				}),
			);

			await controller.installPackage(req, {}, body);

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

	describe('installPackage policy restrictions', () => {
		const body = { name: 'n8n-nodes-test' };
		const installedPackage = { packageName: 'n8n-nodes-test', installedNodes: [] };

		beforeEach(() => {
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
			communityPackagesService.installPackage.mockResolvedValue(
				installedPackage as unknown as InstalledPackages,
			);
		});

		it('adds the policy restrictions to the install response', async () => {
			const policyRestrictions = {
				nodeTypes: [
					{ type: 'n8n-nodes-test.alpha', blockedOn: 'instance' as const, optInAvailable: false },
				],
			};
			installedTypeRestrictions.describeRestrictions.mockResolvedValue(policyRestrictions);

			await expect(controller.installPackage(req, {}, body)).resolves.toEqual({
				...installedPackage,
				policyRestrictions,
			});
		});

		it('leaves the policy restrictions out when no policy was evaluated', async () => {
			installedTypeRestrictions.describeRestrictions.mockResolvedValue(null);

			const response = await controller.installPackage(req, {}, body);

			expect(response).toEqual(installedPackage);
			expect(response).not.toHaveProperty('policyRestrictions');
		});
	});

	describe('updatePackage', () => {
		it('should use the version from the request body and ignore a checksum in the body', async () => {
			const body = {
				name: 'n8n-nodes-test',
				version: '2.0.0',
				checksum: 'a893hfdsy7399',
			} as CommunityPackageRequestDto;

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

			const result = await controller.updatePackage(req, {}, body);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				undefined,
			);

			expect(result).toBe(newInstalledPackage);
		});

		it('should resolve the checksum from the vetted list when unverified packages are disabled', async () => {
			communityPackagesConfig.unverifiedEnabled = false;
			const body = {
				name: 'n8n-nodes-test',
				version: '2.0.0',
				checksum: 'a893hfdsy7399',
			} as CommunityPackageRequestDto;
			communityNodeTypesService.findVetted.mockResolvedValue(
				mock<CommunityNodeType>({ npmVersion: '2.0.0', checksum: 'vetted-checksum' }),
			);
			const previouslyInstalledPackage = mock<InstalledPackages>({
				installedNodes: [],
				installedVersion: '1.0.0',
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(
				mock<InstalledPackages>({ installedNodes: [], installedVersion: '2.0.0' }),
			);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});

			await controller.updatePackage(req, {}, body);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'vetted-checksum',
			);
		});

		it.each(['echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				const body = { name: 'n8n-nodes-test', version };
				await expect(controller.updatePackage(req, {}, body)).rejects.toThrow(
					`Invalid version: ${version}`,
				);
			},
		);
	});
});
