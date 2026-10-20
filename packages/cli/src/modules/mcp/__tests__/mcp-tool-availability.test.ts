import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { User } from '@n8n/db';
import * as permissions from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import { areSkillToolsAvailable, isCommunityNodeInstallAvailable } from '../mcp-tool-availability';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof permissions>()),
	hasGlobalScope: vi.fn(),
}));

const hasGlobalScope = vi.mocked(permissions.hasGlobalScope);

describe('isCommunityNodeInstallAvailable', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const registry = (active: boolean) =>
		mock<ModuleRegistry>({ isActive: vi.fn().mockReturnValue(active) });

	const config = (overrides: Partial<CommunityPackagesConfig> = {}) =>
		({ enabled: true, verifiedEnabled: true, ...overrides }) as CommunityPackagesConfig;

	const globalConfig = (
		overrides: Partial<{
			mcpBuilderEnabled: boolean;
			communityPackagesManagedByEnv: boolean;
		}> = {},
	) => ({
		endpoints: { mcpBuilderEnabled: overrides.mcpBuilderEnabled ?? true },
		instanceSettingsLoader: {
			communityPackagesManagedByEnv: overrides.communityPackagesManagedByEnv ?? false,
		},
	});

	const mcpConfig = (communityNodeDiscoveryEnabled = true) => ({
		communityNodeDiscoveryEnabled,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		hasGlobalScope.mockReturnValue(true);
	});

	test('available when the module is active, verified packages are on, and the user can install', () => {
		expect(
			isCommunityNodeInstallAvailable(registry(true), config(), globalConfig(), mcpConfig(), user),
		).toBe(true);
	});

	test('checks the community-packages module specifically', () => {
		const moduleRegistry = registry(true);

		isCommunityNodeInstallAvailable(moduleRegistry, config(), globalConfig(), mcpConfig(), user);

		expect(moduleRegistry.isActive).toHaveBeenCalledWith('community-packages');
	});

	test('unavailable when the module is inactive', () => {
		expect(
			isCommunityNodeInstallAvailable(registry(false), config(), globalConfig(), mcpConfig(), user),
		).toBe(false);
	});

	test('unavailable without the communityPackage:install global scope', () => {
		hasGlobalScope.mockReturnValue(false);

		expect(
			isCommunityNodeInstallAvailable(registry(true), config(), globalConfig(), mcpConfig(), user),
		).toBe(false);
		expect(hasGlobalScope).toHaveBeenCalledWith(user, 'communityPackage:install');
	});

	test('unavailable when verified packages are disabled', () => {
		// Only vetted packages are installable, so with the catalog off the tool
		// could only ever refuse.
		expect(
			isCommunityNodeInstallAvailable(
				registry(true),
				config({ verifiedEnabled: false }),
				globalConfig(),
				mcpConfig(),
				user,
			),
		).toBe(false);
	});

	test('unavailable when packages are managed from the environment', () => {
		// install() rejects every call on such an instance, so registering the
		// tool would advertise a capability that could only refuse.
		expect(
			isCommunityNodeInstallAvailable(
				registry(true),
				config(),
				globalConfig({ communityPackagesManagedByEnv: true }),
				mcpConfig(),
				user,
			),
		).toBe(false);
	});

	test('unavailable when community packages are disabled entirely', () => {
		expect(
			isCommunityNodeInstallAvailable(
				registry(true),
				config({ enabled: false }),
				globalConfig(),
				mcpConfig(),
				user,
			),
		).toBe(false);
	});

	test('unavailable when the MCP builder is disabled', () => {
		// The tool only registers among the builder tools; the matching consent
		// scope must not be offered while the tool cannot register.
		expect(
			isCommunityNodeInstallAvailable(
				registry(true),
				config(),
				globalConfig({ mcpBuilderEnabled: false }),
				mcpConfig(),
				user,
			),
		).toBe(false);
	});

	test('unavailable when community node discovery is disabled', () => {
		// A consent granted while the flag is off would become install capability
		// the day an operator flips it on, with no new consent screen.
		expect(
			isCommunityNodeInstallAvailable(
				registry(true),
				config(),
				globalConfig(),
				mcpConfig(false),
				user,
			),
		).toBe(false);
	});
});

describe('areSkillToolsAvailable', () => {
	const moduleRegistry = mock<ModuleRegistry>({ settings: mock<ModuleRegistry['settings']>() });

	const globalConfig = ({ builderEnabled = true, skillsHubEnabled = true } = {}) =>
		({
			endpoints: { mcpBuilderEnabled: builderEnabled },
			agents: { skillsHubEnabled },
		}) as unknown as GlobalConfig;

	beforeEach(() => {
		moduleRegistry.isActive.mockReturnValue(true);
		vi.mocked(moduleRegistry.settings.get).mockReturnValue(undefined);
	});

	it('is available when the agents module is active and the skills hub is on', () => {
		expect(areSkillToolsAvailable(globalConfig(), moduleRegistry)).toBe(true);
	});

	it('does not depend on the agent tools', () => {
		vi.mocked(moduleRegistry.settings.get).mockReturnValue({ enabled: false });

		expect(areSkillToolsAvailable(globalConfig({ builderEnabled: false }), moduleRegistry)).toBe(
			true,
		);
	});

	it('is unavailable when the skills hub is off', () => {
		expect(areSkillToolsAvailable(globalConfig({ skillsHubEnabled: false }), moduleRegistry)).toBe(
			false,
		);
	});

	it('is unavailable when the agents module is inactive', () => {
		moduleRegistry.isActive.mockReturnValue(false);

		expect(areSkillToolsAvailable(globalConfig(), moduleRegistry)).toBe(false);
	});
});
