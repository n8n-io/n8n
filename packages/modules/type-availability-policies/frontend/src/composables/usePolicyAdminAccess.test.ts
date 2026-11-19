import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi } from 'vitest';

import { usePolicyAdminAccess } from './usePolicyAdminAccess';
import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
} from '../type-availability-policies.constants';

const setup = ({
	moduleActive = true,
	globalScopes = [],
	projectScopes = [],
}: {
	moduleActive?: boolean;
	globalScopes?: Scope[];
	projectScopes?: Scope[];
}) => {
	createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(
		(moduleName: string) => moduleActive && moduleName === 'type-availability-policies',
	);
	const rbacStore = useRBACStore();
	rbacStore.setGlobalScopes(globalScopes);
	for (const scope of projectScopes) {
		rbacStore.addProjectScope(scope, { projectId: 'project-1' });
	}
	return usePolicyAdminAccess();
};

describe('usePolicyAdminAccess', () => {
	it('gives both kinds to a user with both global scopes', () => {
		const { manageableKinds, canManagePolicies } = setup({
			globalScopes: ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
		});

		expect(manageableKinds.value).toEqual(['node', 'credential']);
		expect(canManagePolicies.value).toBe(true);
	});

	it('gives only the node kind to a user with only the node scope', () => {
		const { manageableKinds } = setup({ globalScopes: ['nodeTypePolicy:manage'] });

		expect(manageableKinds.value).toEqual(['node']);
	});

	it('gives only the credential kind to a user with only the credential scope', () => {
		const { manageableKinds } = setup({ globalScopes: ['credentialTypePolicy:manage'] });

		expect(manageableKinds.value).toEqual(['credential']);
	});

	it('ignores the policy scopes that a user holds only in a project', () => {
		const { manageableKinds, canManagePolicies } = setup({
			projectScopes: ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
		});

		expect(manageableKinds.value).toEqual([]);
		expect(canManagePolicies.value).toBe(false);
	});

	it('gives nothing when the module is not active', () => {
		const { canManagePolicies } = setup({
			moduleActive: false,
			globalScopes: ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
		});

		expect(canManagePolicies.value).toBe(false);
	});

	it('enters through the landing page with both scopes', () => {
		const { entryRouteName } = setup({
			globalScopes: ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
		});

		expect(entryRouteName.value).toBe(POLICIES_LANDING_VIEW);
	});

	it('enters the instance policy page directly with one scope', () => {
		const { entryRouteName } = setup({ globalScopes: ['credentialTypePolicy:manage'] });

		expect(entryRouteName.value).toBe(INSTANCE_POLICY_VIEW);
	});
});
