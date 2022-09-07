import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export function isWorkflowSharingEnabled(): boolean {
	return isUserManagementEnabled() && String(process.env.N8N_WORKFLOW_SHARING_ENABLED) === 'true';
}
