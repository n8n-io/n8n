import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { RBACPermissionCheck, AuthenticatedPermissionOptions } from '@/types/rbac';

export const isAuthenticated: RBACPermissionCheck<AuthenticatedPermissionOptions> = (options) => {
	if (options?.bypass?.()) {
		return true;
	}

	const usersStore = useUsersStore();
	return !!usersStore.currentUser;
};

export const shouldEnableMfa: RBACPermissionCheck<AuthenticatedPermissionOptions> = () => {
	// Had user got MFA enabled?
	const usersStore = useUsersStore();
	const hasUserEnabledMfa = usersStore.currentUser?.mfaAuthenticated ?? false;

	// Are we enforcing MFA?
	const settingsStore = useSettingsStore();
	const isMfaEnforced = settingsStore.isMFAEnforced;

	return !hasUserEnabledMfa && isMfaEnforced;
};
