import { Service } from 'typedi';
import { DataSource, type FindOptionsWhere, Repository, In, Not } from 'typeorm';
import { SharedWorkflow } from '../entities/SharedWorkflow';
import { type User } from '../entities/User';
import type { Scope } from '@n8n/permissions';
import type { Role } from '../entities/Role';

@Service()
export class SharedWorkflowRepository extends Repository<SharedWorkflow> {
	constructor(dataSource: DataSource) {
		super(SharedWorkflow, dataSource.manager);
	}

	async hasAccess(workflowId: string, user: User) {
		const where: FindOptionsWhere<SharedWorkflow> = {
			workflowId,
		};
		if (!user.hasGlobalScope('workflow:read')) {
			where.userId = user.id;
		}
		return this.exist({ where });
	}

	async getSharedWorkflowIds(workflowIds: string[]) {
		const sharedWorkflows = await this.find({
			select: ['workflowId'],
			where: {
				workflowId: In(workflowIds),
			},
		});
		return sharedWorkflows.map((sharing) => sharing.workflowId);
	}

	async findByWorkflowIds(workflowIds: string[]) {
		return this.find({
			relations: ['role', 'user'],
			where: {
				role: {
					name: 'owner',
					scope: 'workflow',
				},
				workflowId: In(workflowIds),
			},
		});
	}

	async findSharing(
		workflowId: string,
		user: User,
		scope: Scope,
		{ roles, extraRelations }: { roles?: string[]; extraRelations?: string[] } = {},
	) {
		const where: FindOptionsWhere<SharedWorkflow> = {
			workflow: { id: workflowId },
		};

		if (!user.hasGlobalScope(scope)) {
			where.user = { id: user.id };
		}

		if (roles) {
			where.role = { name: In(roles) };
		}

		const relations = ['workflow', 'role'];

		if (extraRelations) relations.push(...extraRelations);

		return this.findOne({ relations, where });
	}

	async makeOwnerOfAllWorkflows(user: User, role: Role) {
		return this.update({ userId: Not(user.id), roleId: role.id }, { user });
	}
}
