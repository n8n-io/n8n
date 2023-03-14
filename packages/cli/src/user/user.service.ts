import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import * as Db from '@/Db';
import { User } from '@db/entities/User';
import type { PublicUser } from '..';

export class UserService {
	static async get(where: FindOptionsWhere<User>): Promise<User | null> {
		return Db.collections.User.findOne({
			relations: ['globalRole'],
			where,
		});
	}

	static async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}

	static async getOneSuccessfullyExecutedWorkflow(user: PublicUser) {
		const showUserActivationSurvey = user.settings?.showUserActivationSurvey;

		if (!showUserActivationSurvey) {
			const sharedWorkflows = await Db.collections.SharedWorkflow.find({
				select: ['workflowId'],
				//filter only where the workflow the user is the workflow owner;
				where: { userId: user.id },
			});

			return Db.collections.Execution.findOne({
				select: ['workflowData'],
				where: {
					workflowId: In(sharedWorkflows.map((d) => d.workflowId)),
					status: 'success',
					mode: In(['retry', 'webhook', 'trigger']),
				},
			});
		}

		return undefined;
	}
}
