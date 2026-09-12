import type { ModuleRegistry } from '@n8n/backend-common';
import { User } from '@n8n/db';
import * as permissions from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import { isCommunityNodeInstallAvailable } from '../mcp-tool-availability';

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

	beforeEach(() => {
		vi.clearAllMocks();
		hasGlobalScope.mockReturnValue(true);
	});

	test('available when the module is active, verified packages are on, and the user can install', () => {
		expect(isCommunityNodeInstallAvailable(registry(true), config(), user)).toBe(true);
	});

	test('checks the community-packages module specifically', () => {
		const moduleRegistry = registry(true);

		isCommunityNodeInstallAvailable(moduleRegistry, config(), user);

		expect(moduleRegistry.isActive).toHaveBeenCalledWith('community-packages');
	});

	test('unavailable when the module is inactive', () => {
		expect(isCommunityNodeInstallAvailable(registry(false), config(), user)).toBe(false);
	});

	test('unavailable without the communityPackage:install global scope', () => {
		hasGlobalScope.mockReturnValue(false);

		expect(isCommunityNodeInstallAvailable(registry(true), config(), user)).toBe(false);
		expect(hasGlobalScope).toHaveBeenCalledWith(user, 'communityPackage:install');
	});

	test('unavailable when verified packages are disabled', () => {
		// Only vetted packages are installable, so with the catalog off the tool
		// could only ever refuse.
		expect(
			isCommunityNodeInstallAvailable(registry(true), config({ verifiedEnabled: false }), user),
		).toBe(false);
	});

	test('unavailable when community packages are disabled entirely', () => {
		expect(isCommunityNodeInstallAvailable(registry(true), config({ enabled: false }), user)).toBe(
			false,
		);
	});
});
