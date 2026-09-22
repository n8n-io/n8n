import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrontendModuleSettings } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(),
}));

import { hasPermission } from '@/app/utils/rbac/permissions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	useInstanceAiAvailable,
	useInstanceAiReady,
} from '../composables/useInstanceAiAvailability';

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

function setModuleSettings(overrides: Partial<InstanceAiModuleSettings> = {}) {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: ['instance-ai'],
	} as typeof settingsStore.settings;
	settingsStore.moduleSettings = {
		'instance-ai': {
			enabled: true,
			localGatewayDisabled: false,
			browserUseEnabled: true,
			proxyEnabled: false,
			cloudManaged: false,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
			setupCompleted: false,
			...overrides,
		},
	};
}

/** Grant only the listed scopes, so admin and member cases differ by scope alone. */
function grantScopes(...scopes: Scope[]) {
	vi.mocked(hasPermission).mockImplementation((_rules, options) =>
		scopes.includes(options?.rbac?.scope as Scope),
	);
}

describe('Instance AI availability gates', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('lets an admin reach the feature before setup finishes, so they can complete it', () => {
		setModuleSettings({ setupCompleted: false });
		grantScopes('instanceAi:manage', 'instanceAi:message');

		expect(useInstanceAiAvailable().value).toBe(true);
	});

	it('does not treat that admin as ready to be prompted', () => {
		setModuleSettings({ setupCompleted: false });
		grantScopes('instanceAi:manage', 'instanceAi:message');

		expect(useInstanceAiReady().value).toBe(false);
	});

	it('keeps a member out entirely until setup finishes', () => {
		setModuleSettings({ setupCompleted: false });
		grantScopes('instanceAi:message');

		expect(useInstanceAiAvailable().value).toBe(false);
		expect(useInstanceAiReady().value).toBe(false);
	});

	it('is ready for everyone once setup is complete', () => {
		setModuleSettings({ setupCompleted: true });
		grantScopes('instanceAi:message');

		expect(useInstanceAiReady().value).toBe(true);
	});

	it('is never ready while an admin has the module switched off', () => {
		setModuleSettings({ setupCompleted: true, enabled: false });
		grantScopes('instanceAi:manage', 'instanceAi:message');

		expect(useInstanceAiReady().value).toBe(false);
	});
});
