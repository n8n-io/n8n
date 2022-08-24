import config from '../../config';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export function isCredentialsSharingEnabled(): boolean {
	return isUserManagementEnabled() && config.getEnv('experimental.credentialsSharing');
}
