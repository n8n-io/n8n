import { User } from '../../databases/entities/User';
import { Db } from '../..';

export async function getSharedWorkflowIds(user: User): Promise<number[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			user,
		},
	});
	return sharedWorkflows.map((workflow) => workflow.workflowId);
}

export async function getWorkflowAccess(
	user: User,
	workflowId: string | undefined,
): Promise<boolean> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			user,
			workflow: { id: workflowId },
		},
	});
	return !!sharedWorkflows.length;
}
