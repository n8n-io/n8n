import config from '../../config';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export function isWorkflowSharingEnabled(): boolean {
	return isUserManagementEnabled() && config.getEnv('enterprise.features.sharing');
}
