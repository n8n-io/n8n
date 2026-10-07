import type { ModuleRegistry } from '@n8n/backend-common';
import { User } from '@n8n/db';
import * as permissions from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { CapabilitySurface } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';
import { CAPABILITY_TOOLS_BY_SCOPE } from '@/services/capabilities/capability-scopes';
import { parseScheduleCapability } from '@/services/capabilities/parse-schedule.capability';

import {
	getUnregisteredCapabilityTools,
	isCommunityNodeInstallAvailable,
} from '../mcp-tool-availability';

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

describe('getUnregisteredCapabilityTools', () => {
	const allCapabilityTools = Object.values(CAPABILITY_TOOLS_BY_SCOPE).flatMap(
		(names) => names ?? [],
	);

	it('returns every listed capability tool while no module registered one', () => {
		const unregistered = getUnregisteredCapabilityTools(new CapabilityRegistry());

		expect(unregistered).toEqual(allCapabilityTools);
		expect(unregistered).toContain('parse_schedule');
	});

	it('leaves out a capability that a module registered for MCP', () => {
		const registry = new CapabilityRegistry();
		registry.register(parseScheduleCapability);

		const unregistered = getUnregisteredCapabilityTools(registry);

		expect(unregistered).not.toContain('parse_schedule');
		expect(unregistered).toEqual(allCapabilityTools.filter((name) => name !== 'parse_schedule'));
	});

	// A capability that reaches only the Assistant is not on the MCP server, so consent hides it.
	it('reads the MCP surface only', () => {
		const list = vi.fn((surface: CapabilitySurface) =>
			surface === 'assistant' ? [parseScheduleCapability] : [],
		);

		const unregistered = getUnregisteredCapabilityTools({ list });

		expect(unregistered).toContain('parse_schedule');
		expect(list).toHaveBeenCalledWith('mcp');
		expect(list).not.toHaveBeenCalledWith('assistant');
	});
});
