import { User } from '@/databases/entities/User';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { ExecutionsService } from './executions.service';

export class EEExecutionsService extends ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User regardless of role
	 */
	static async getWorkflowIdsForUser(user: User): Promise<string[]> {
		// Get all workflows
		return getSharedWorkflowIds(user);
	}
}
