import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import type { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';
import { CommunityPackagesInstanceSettingsLoader } from '../loaders/community-packages.instance-settings-loader';

type Vetted = {
	npmVersion: string;
	checksum: string;
	nodeVersions?: Array<{ npmVersion: string; checksum: string }>;
};

const installedPackage = (packageName: string, installedVersion: string) =>
	({
		packageName,
		installedVersion,
		installedNodes: [],
	}) as unknown as InstalledPackages;

describe('CommunityPackagesInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const communityPackagesService = mock<CommunityPackagesService>();
	const communityNodeTypesService = mock<CommunityNodeTypesService>();
	const workflowRepository = mock<WorkflowRepository>();

	const createLoader = (
		configOverrides: Partial<InstanceSettingsLoaderConfig> = {},
		communityOverrides: Partial<CommunityPackagesConfig> = {},
	) => {
		const config = {
			communityPackagesManagedByEnv: true,
			communityPackages: '',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		const communityPackagesConfig = {
			enabled: true,
			unverifiedEnabled: true,
			...communityOverrides,
		} as CommunityPackagesConfig;

		return new CommunityPackagesInstanceSettingsLoader(
			config,
			communityPackagesConfig,
			communityPackagesService,
			communityNodeTypesService,
			workflowRepository,
			logger,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		communityPackagesService.parseNpmPackageName.mockImplementation((name?: string) => ({
			packageName: name ?? '',
			scope: undefined,
			version: undefined,
			rawString: name ?? '',
		}));
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([]);
		communityNodeTypesService.findVetted.mockResolvedValue(
			undefined as unknown as Awaited<ReturnType<CommunityNodeTypesService['findVetted']>>,
		);
		workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([]);
	});

	describe('gating', () => {
		it('returns "skipped" when communityPackagesManagedByEnv is false', async () => {
			const loader = createLoader({ communityPackagesManagedByEnv: false });

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});

		it('returns "skipped" when community packages are disabled', async () => {
			const loader = createLoader({}, { enabled: false });

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});
	});

	describe('parse + validation errors', () => {
		const expectBootstrapError = async (
			loader: CommunityPackagesInstanceSettingsLoader,
			pattern: RegExp,
		) => {
			let thrown: unknown;
			try {
				await loader.run();
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(InstanceBootstrappingError);
			expect((thrown as Error).message).toMatch(pattern);
		};

		it('throws on malformed JSON', async () => {
			const loader = createLoader({ communityPackages: '{not json' });

			await expectBootstrapError(loader, /not valid JSON/);
		});

		it('throws when the top-level value is not an array', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify({ name: 'n8n-nodes-foo', version: '1.0.0' }),
			});

			await expectBootstrapError(loader, /validation failed/);
		});

		it('throws on unknown top-level fields', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-foo', version: '1.0.0', extra: 'nope' },
				]),
			});

			await expectBootstrapError(loader, /validation failed/);
		});

		it('throws when name is missing', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([{ version: '1.0.0' }]),
			});

			await expectBootstrapError(loader, /validation failed/);
		});

		it('throws on duplicate package names', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-foo', version: '1.0.0' },
					{ name: 'n8n-nodes-foo', version: '2.0.0' },
				]),
			});

			await expectBootstrapError(loader, /duplicate/);
		});

		it('throws on invalid version specifier', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: 'NOT VALID' }]),
			});

			await expectBootstrapError(loader, /invalid version/);
		});

		it('throws when parseNpmPackageName rejects the name', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementation(() => {
				throw new Error('Package name must start with n8n-nodes-');
			});
			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'wrong-prefix-foo', version: '1.0.0' }]),
			});

			await expectBootstrapError(loader, /invalid package name/);
		});

		it('throws when name suffix and version field disagree', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementation((name?: string) => ({
				packageName: 'n8n-nodes-foo',
				scope: undefined,
				version: '1.0.0',
				rawString: name ?? '',
			}));
			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo@1.0.0', version: '2.0.0' }]),
			});

			await expectBootstrapError(loader, /conflicting versions/);
		});
	});

	describe('name normalization', () => {
		it('reconciles using the parsed package name when name includes a version suffix', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementation((name?: string) => {
				const raw = name ?? '';
				const at = raw.lastIndexOf('@');
				const hasVersion = at > 0;
				return {
					packageName: hasVersion ? raw.slice(0, at) : raw,
					scope: undefined,
					version: hasVersion ? raw.slice(at + 1) : undefined,
					rawString: raw,
				};
			});
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '1.0.0'),
			]);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo@1.0.0' }]),
			});

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});

		it('accepts a checksum when the version is embedded in the name', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementation((name?: string) => {
				const raw = name ?? '';
				const at = raw.lastIndexOf('@');
				const hasVersion = at > 0;
				return {
					packageName: hasVersion ? raw.slice(0, at) : raw,
					scope: undefined,
					version: hasVersion ? raw.slice(at + 1) : undefined,
					rawString: raw,
				};
			});

			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-foo@1.2.3', checksum: 'sha512-from-env' },
				]),
			});

			await expect(loader.run()).resolves.toBe('created');
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'1.2.3',
				'sha512-from-env',
			);
		});

		it('updates when name suffix version differs from installed version', async () => {
			communityPackagesService.parseNpmPackageName.mockImplementation((name?: string) => {
				const raw = name ?? '';
				const at = raw.lastIndexOf('@');
				const hasVersion = at > 0;
				return {
					packageName: hasVersion ? raw.slice(0, at) : raw,
					scope: undefined,
					version: hasVersion ? raw.slice(at + 1) : undefined,
					rawString: raw,
				};
			});
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '1.0.0'),
			]);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo@2.0.0' }]),
			});

			await expect(loader.run()).resolves.toBe('created');
			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				expect.objectContaining({ packageName: 'n8n-nodes-foo' }),
				'2.0.0',
				undefined,
			);
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});
	});

	describe('reconcile', () => {
		it('installs missing packages, updates mismatched versions, removes extras', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-keep', '1.0.0'),
				installedPackage('n8n-nodes-update', '1.0.0'),
				installedPackage('n8n-nodes-extra', '0.5.0'),
			]);

			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-keep', version: '1.0.0' },
					{ name: 'n8n-nodes-update', version: '2.0.0' },
					{ name: 'n8n-nodes-new', version: '0.1.0' },
				]),
			});

			await expect(loader.run()).resolves.toBe('created');

			expect(communityPackagesService.installPackage).toHaveBeenCalledTimes(1);
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-new',
				'0.1.0',
				undefined,
			);

			expect(communityPackagesService.updatePackage).toHaveBeenCalledTimes(1);
			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-update',
				expect.objectContaining({ packageName: 'n8n-nodes-update' }),
				'2.0.0',
				undefined,
			);

			expect(communityPackagesService.removePackage).toHaveBeenCalledTimes(1);
			expect(communityPackagesService.removePackage).toHaveBeenCalledWith(
				'n8n-nodes-extra',
				expect.objectContaining({ packageName: 'n8n-nodes-extra' }),
			);
		});

		it('returns "skipped" when no changes are needed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '1.0.0'),
			]);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: '1.0.0' }]),
			});

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});

		it('continues with remaining items when one install fails', async () => {
			communityPackagesService.installPackage.mockImplementation(async (name) => {
				if (name === 'n8n-nodes-bad') throw new Error('npm boom');
				return installedPackage(name, '1.0.0');
			});

			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-bad', version: '1.0.0' },
					{ name: 'n8n-nodes-good', version: '1.0.0' },
				]),
			});

			await expect(loader.run()).resolves.toBe('created');

			expect(communityPackagesService.installPackage).toHaveBeenCalledTimes(2);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('n8n-nodes-bad'));
		});

		it('continues with remaining items when one remove fails', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-stuck', '1.0.0'),
				installedPackage('n8n-nodes-extra', '1.0.0'),
			]);
			communityPackagesService.removePackage.mockImplementation(async (name) => {
				if (name === 'n8n-nodes-stuck') throw new Error('rm boom');
			});

			const loader = createLoader({
				communityPackages: JSON.stringify([]),
			});

			await expect(loader.run()).resolves.toBe('created');

			expect(communityPackagesService.removePackage).toHaveBeenCalledTimes(2);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('n8n-nodes-stuck'));
		});
	});

	describe('toRemove with workflow impact', () => {
		const installedPackageWithNodes = (
			packageName: string,
			installedVersion: string,
			nodeTypes: string[],
		) =>
			({
				packageName,
				installedVersion,
				installedNodes: nodeTypes.map((type) => ({ type })),
			}) as unknown as InstalledPackages;

		it('includes affected workflow ids in the removal warning', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackageWithNodes('n8n-nodes-extra', '1.2.3', ['extraNode']),
			]);
			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([
				{ id: 'wf-1', name: 'Workflow 1', active: true, activeVersionId: 'v1' },
				{ id: 'wf-2', name: 'Workflow 2', active: false, activeVersionId: 'v2' },
			]);

			const loader = createLoader({ communityPackages: JSON.stringify([]) });

			await expect(loader.run()).resolves.toBe('created');

			expect(workflowRepository.findWorkflowsWithNodeType).toHaveBeenCalledWith(['extraNode']);
			expect(logger.warn).toHaveBeenCalledWith(
				"Removed community package 'n8n-nodes-extra' (had 1 registered node type(s)) — not declared in N8N_COMMUNITY_PACKAGES",
				{
					packageName: 'n8n-nodes-extra',
					installedVersion: '1.2.3',
					workflowIds: ['wf-1', 'wf-2'],
					activeWorkflowIds: ['wf-1'],
				},
			);
			expect(communityPackagesService.removePackage).toHaveBeenCalledWith(
				'n8n-nodes-extra',
				expect.objectContaining({ packageName: 'n8n-nodes-extra' }),
			);
		});

		it('emits empty workflow-id arrays when no workflows reference the package', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackageWithNodes('n8n-nodes-extra', '1.0.0', ['extraNode']),
			]);
			workflowRepository.findWorkflowsWithNodeType.mockResolvedValue([]);

			const loader = createLoader({ communityPackages: JSON.stringify([]) });

			await expect(loader.run()).resolves.toBe('created');

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Removed community package 'n8n-nodes-extra'"),
				expect.objectContaining({ workflowIds: [], activeWorkflowIds: [] }),
			);
			expect(communityPackagesService.removePackage).toHaveBeenCalled();
		});

		it('still removes the package when the workflow lookup fails', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackageWithNodes('n8n-nodes-extra', '1.0.0', ['extraNode']),
			]);
			workflowRepository.findWorkflowsWithNodeType.mockRejectedValue(new Error('db down'));

			const loader = createLoader({ communityPackages: JSON.stringify([]) });

			await expect(loader.run()).resolves.toBe('created');

			expect(logger.warn).toHaveBeenCalledWith(
				"Failed to check workflows referencing community package 'n8n-nodes-extra' before removal",
				expect.objectContaining({ packageName: 'n8n-nodes-extra' }),
			);
			expect(communityPackagesService.removePackage).toHaveBeenCalled();
		});

		it('does not query workflows for packages on the install/update paths', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackageWithNodes('n8n-nodes-update', '1.0.0', ['updateNode']),
			]);

			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-update', version: '2.0.0' },
					{ name: 'n8n-nodes-new', version: '0.1.0' },
				]),
			});

			await loader.run();

			expect(workflowRepository.findWorkflowsWithNodeType).not.toHaveBeenCalled();
		});
	});

	describe('checksum resolution', () => {
		it('uses env-provided checksum when present', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([
					{ name: 'n8n-nodes-foo', version: '1.0.0', checksum: 'sha512-from-env' },
				]),
			});

			await loader.run();

			expect(communityNodeTypesService.findVetted).not.toHaveBeenCalled();
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'1.0.0',
				'sha512-from-env',
			);
		});

		it('falls back to vetted checksum when version matches latest', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue({
				npmVersion: '1.0.0',
				checksum: 'sha512-vetted-latest',
			} as unknown as Vetted as never);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: '1.0.0' }]),
			});

			await loader.run();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'1.0.0',
				'sha512-vetted-latest',
			);
		});

		it('falls back to nodeVersions checksum for older versions', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue({
				npmVersion: '2.0.0',
				checksum: 'sha512-latest',
				nodeVersions: [{ npmVersion: '1.0.0', checksum: 'sha512-v1' }],
			} as unknown as Vetted as never);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: '1.0.0' }]),
			});

			await loader.run();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'1.0.0',
				'sha512-v1',
			);
		});

		it('installs without checksum when unverified packages are enabled and none is found', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined as never);

			const loader = createLoader(
				{ communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: '1.0.0' }]) },
				{ unverifiedEnabled: true },
			);

			await loader.run();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'1.0.0',
				undefined,
			);
		});

		it('throws InstanceBootstrappingError naming the package when no checksum and unverified are disabled', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined as never);

			const loader = createLoader(
				{ communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', version: '1.0.0' }]) },
				{ unverifiedEnabled: false },
			);

			let thrown: unknown;
			try {
				await loader.run();
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(InstanceBootstrappingError);
			expect((thrown as Error).message).toContain('n8n-nodes-foo');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});
	});

	describe('optional version', () => {
		it('rejects entries with checksum but no version', async () => {
			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo', checksum: 'sha512-orphan' }]),
			});

			let thrown: unknown;
			try {
				await loader.run();
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(InstanceBootstrappingError);
			expect((thrown as Error).message).toMatch(/checksum requires a version/);
		});

		it('adopts vetted version and checksum when version is omitted', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue({
				npmVersion: '2.5.0',
				checksum: 'sha512-vetted',
			} as unknown as Vetted as never);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]),
			});

			await expect(loader.run()).resolves.toBe('created');

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				'2.5.0',
				'sha512-vetted',
			);
		});

		it('skips update when installed version already matches vetted resolution', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '2.5.0'),
			]);
			communityNodeTypesService.findVetted.mockResolvedValue({
				npmVersion: '2.5.0',
				checksum: 'sha512-vetted',
			} as unknown as Vetted as never);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]),
			});

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
		});

		it('updates when vetted resolves to a different version than what is installed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '1.0.0'),
			]);
			communityNodeTypesService.findVetted.mockResolvedValue({
				npmVersion: '2.5.0',
				checksum: 'sha512-vetted',
			} as unknown as Vetted as never);

			const loader = createLoader({
				communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]),
			});

			await expect(loader.run()).resolves.toBe('created');
			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				expect.objectContaining({ packageName: 'n8n-nodes-foo' }),
				'2.5.0',
				'sha512-vetted',
			);
		});

		it('installs with undefined version and warns when no vetted entry and unverified is enabled', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined as never);

			const loader = createLoader(
				{ communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]) },
				{ unverifiedEnabled: true },
			);

			await expect(loader.run()).resolves.toBe('created');

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'n8n-nodes-foo',
				undefined,
				undefined,
			);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('no pinned version and no vetted entry'),
			);
		});

		it('does not reinstall on next boot when version is omitted and package is already installed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([
				installedPackage('n8n-nodes-foo', '1.2.3'),
			]);
			communityNodeTypesService.findVetted.mockResolvedValue(undefined as never);

			const loader = createLoader(
				{ communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]) },
				{ unverifiedEnabled: true },
			);

			await expect(loader.run()).resolves.toBe('skipped');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
		});

		it('throws bootstrap error without version suffix when no version, no vetted, unverified disabled', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined as never);

			const loader = createLoader(
				{ communityPackages: JSON.stringify([{ name: 'n8n-nodes-foo' }]) },
				{ unverifiedEnabled: false },
			);

			let thrown: unknown;
			try {
				await loader.run();
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(InstanceBootstrappingError);
			expect((thrown as Error).message).toContain("'n8n-nodes-foo'");
			expect((thrown as Error).message).not.toContain('@');
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
		});
	});
});
