import { FindOneOptions, ObjectLiteral } from 'typeorm';
import { Db } from '..';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

export class WorkflowsService {
	static async getSharing(
		user: User,
		workflowId: number | string,
		relations: string[] = ['workflow'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedWorkflow | undefined> {
		const options: FindOneOptions<SharedWorkflow> & { where: ObjectLiteral } = {
			where: {
				workflow: { id: workflowId },
			},
		};

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// workflows they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			options.where.user = { id: user.id };
		}

		if (relations?.length) {
			options.relations = relations;
		}

		return Db.collections.SharedWorkflow.findOne(options);
	}

	static async get(workflow: Partial<WorkflowEntity>, options?: { relations: string[] }) {
		return Db.collections.Workflow.findOne(workflow, options);
	}
}
