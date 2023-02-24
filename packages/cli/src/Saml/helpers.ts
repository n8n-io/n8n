import { getLicense } from '../License';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

/**
 *  Check whether the SAML feature is licensed and enabled in the instance
 */
export function isSamlEnabled(): boolean {
	const license = getLicense();
	return isUserManagementEnabled() && license.isSamlEnabled();
}
