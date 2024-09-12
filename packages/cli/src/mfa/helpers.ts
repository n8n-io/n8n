import Container from 'typedi';

import config from '@/config';
import { UserRepository } from '@/databases/repositories/user.repository';

import { MFA_FEATURE_ENABLED } from './constants';

export const isMfaFeatureEnabled = () => config.get(MFA_FEATURE_ENABLED);

const isMfaFeatureDisabled = () => !isMfaFeatureEnabled();

const getUsersWithMfaEnabled = async () =>
	await Container.get(UserRepository).count({ where: { mfaEnabled: true } });

export const handleMfaDisable = async () => {
	if (isMfaFeatureDisabled()) {
		// check for users with MFA enabled, and if there are
		// users, then keep the feature enabled
		const users = await getUsersWithMfaEnabled();
		if (users) {
			config.set(MFA_FEATURE_ENABLED, true);
		}
	}
};
