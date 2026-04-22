import type { CommunityNodeType } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { Push } from '@/push';

import type { CommunityNodeTypesService } from '../community-node-types.service';
import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesLifecycleService } from '../community-packages.lifecycle.service';
import type { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';
import { executeNpmCommand } from '../npm-utils';

jest.mock('../npm-utils', () => ({
	...jest.requireActual('../npm-utils'),
	executeNpmCommand: jest.fn(),
	isNpmExecErrorWithStdout: jest.requireActual('../npm-utils').isNpmExecErrorWithStdout,
}));

const mockedExecuteNpmCommand = jest.mocked(executeNpmCommand);

describe('CommunityPackagesLifecycleService', () => {
	const logger = mock<Logger>();
	const push = mock<Push>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const eventService = mock<EventService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const instanceSettings = mock<{ nodesDownloadDir: string }>({
		nodesDownloadDir: '/tmp/n8n-nodes-download',
	});
	const communityPackagesConfig = mock<CommunityPackagesConfig>({
		unverifiedEnabled: true,
	});

	const lifecycle = new CommunityPackagesLifecycleService(
		logger,
		push,
		communityPackagesService,
		eventService,
		communityNodeTypesService,
		instanceSettings as never,
		communityPackagesConfig,
	);

	const user = { id: 'user123' };

	const mockPackage = (installedVersion: string) =>
		mock<InstalledPackages>({
			installedNodes: [{ type: 'testNode', latestVersion: 1, name: 'testNode' }],
			installedVersion,
			authorName: 'Author',
			authorEmail: 'author@example.com',
		});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('install', () => {
		it('should throw error if verify in options but no checksum', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);

			await expect(
				lifecycle.install({ name: 'n8n-nodes-test', verify: true, version: '1.0.0' }, user, 'ui'),
			).rejects.toThrow('Package n8n-nodes-test is not vetted for installation');

			expect(communityNodeTypesService.findVetted).toHaveBeenCalledWith('n8n-nodes-test');
		});

		it.each(['echo "hello"', '1.a.b', '0.1.29#;ls'])(
			'should throw error if version is invalid',
			async (version) => {
				await expect(
					lifecycle.install({ name: 'n8n-nodes-test', verify: true, version }, user, 'ui'),
				).rejects.toThrow(`Invalid version: ${version}`);
			},
		);

		it('should install with checksum when verify is true', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(
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

	describe('listInstalledPackages', () => {
		const installedPackage = mock<InstalledPackages>({
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			installedNodes: [],
		});

		it('should run npm outdated when unverifiedEnabled is true', async () => {
			communityPackagesConfig.unverifiedEnabled = true;
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([installedPackage]);
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([
				{ ...installedPackage, updateAvailable: '2.0.0' },
			]);
			Object.defineProperty(communityPackagesService, 'hasMissingPackages', { value: false });

			await lifecycle.listInstalledPackages();

			expect(mockedExecuteNpmCommand).toHaveBeenCalledWith(['outdated', '--json'], {
				doNotHandleError: true,
				cwd: '/tmp/n8n-nodes-download',
			});
		});

		it('should not run npm outdated when unverifiedEnabled is false', async () => {
			communityPackagesConfig.unverifiedEnabled = false;
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([installedPackage]);
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([installedPackage]);
			Object.defineProperty(communityPackagesService, 'hasMissingPackages', { value: false });

			await lifecycle.listInstalledPackages();

			expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
			expect(communityPackagesService.matchPackagesWithUpdates).toHaveBeenCalledWith(
				[installedPackage],
				undefined,
			);
		});

		it('should not report update for verified package at Strapi version when unverifiedEnabled is false', async () => {
			// Scenario: package installed at Strapi-vetted version (0.2.2), newer version (0.2.4) exists on npm.
			// With unverifiedEnabled=false, npm outdated is skipped so updateAvailable stays undefined.
			// Update detection in this mode is handled by the frontend via Strapi version comparison.
			communityPackagesConfig.unverifiedEnabled = false;
			const vettedPackage = mock<InstalledPackages>({
				packageName: 'n8n-nodes-elevenlabs',
				installedVersion: '0.2.2',
				installedNodes: [],
			});
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([vettedPackage]);
			// Simulate real matchPackagesWithUpdates: without updates arg, returns packages without updateAvailable
			const returnedPackage = {
				packageName: 'n8n-nodes-elevenlabs',
				installedVersion: '0.2.2',
				installedNodes: [],
			};
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([returnedPackage as never]);
			Object.defineProperty(communityPackagesService, 'hasMissingPackages', { value: false });

			const result = await lifecycle.listInstalledPackages();

			expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
			expect(communityPackagesService.matchPackagesWithUpdates).toHaveBeenCalledWith(
				[vettedPackage],
				undefined,
			);
			// Package should not have updateAvailable — npm outdated was never consulted
			expect(result).toHaveLength(1);
			expect(result[0]).not.toHaveProperty('updateAvailable');
		});

		it('should return empty array when no packages are installed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([]);

			const result = await lifecycle.listInstalledPackages();

			expect(result).toEqual([]);
			expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
		});

		it('should parse npm outdated output and pass updates to matchPackagesWithUpdates', async () => {
			communityPackagesConfig.unverifiedEnabled = true;
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([installedPackage]);
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([installedPackage]);
			Object.defineProperty(communityPackagesService, 'hasMissingPackages', { value: false });

			const npmOutdatedOutput = JSON.stringify({
				'n8n-nodes-test': { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' },
			});
			mockedExecuteNpmCommand.mockRejectedValue(
				Object.assign(new Error(), { code: 1, stdout: npmOutdatedOutput }),
			);

			await lifecycle.listInstalledPackages();

			expect(communityPackagesService.matchPackagesWithUpdates).toHaveBeenCalledWith(
				[installedPackage],
				{ 'n8n-nodes-test': { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' } },
			);
		});
	});

	describe('update', () => {
		it('should use the version from the request when updating a package', async () => {
			const previouslyInstalledPackage = mockPackage('1.0.0');
			const newInstalledPackage = mockPackage('2.0.0');

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

		it.each(['echo "hello"', '1.a.b', '0.1.29#;ls'])(
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

		it('should throw error if verify is true but package is not vetted', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);

			await expect(
				lifecycle.update(
					{ name: 'n8n-nodes-test', version: '2.0.0', verify: true },
					user,
					'badRequest',
				),
			).rejects.toThrow('Package n8n-nodes-test is not vetted for installation');
		});

		it('should update with checksum when verify is true and version matches latest', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(
				mock<CommunityNodeType>({
					checksum: 'vetted-checksum',
					npmVersion: '2.0.0',
					nodeVersions: [],
				}),
			);
			const previouslyInstalledPackage = mockPackage('1.0.0');
			const newInstalledPackage = mockPackage('2.0.0');
			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});

			await lifecycle.update(
				{ name: 'n8n-nodes-test', version: '2.0.0', verify: true },
				user,
				'badRequest',
			);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'2.0.0',
				'vetted-checksum',
			);
		});

		it('should use version-specific checksum from nodeVersions when targeting older version', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(
				mock<CommunityNodeType>({
					checksum: 'latest-checksum',
					npmVersion: '2.0.0',
					nodeVersions: [{ npmVersion: '1.0.0', checksum: 'v1-checksum' }],
				}),
			);
			const previouslyInstalledPackage = mockPackage('0.5.0');
			const newInstalledPackage = mockPackage('1.0.0');
			communityPackagesService.findInstalledPackage.mockResolvedValue(previouslyInstalledPackage);
			communityPackagesService.updatePackage.mockResolvedValue(newInstalledPackage);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				rawString: 'n8n-nodes-test',
				packageName: 'n8n-nodes-test',
				version: undefined,
			});

			await lifecycle.update(
				{ name: 'n8n-nodes-test', version: '1.0.0', verify: true },
				user,
				'badRequest',
			);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-test',
				previouslyInstalledPackage,
				'1.0.0',
				'v1-checksum',
			);
		});

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
