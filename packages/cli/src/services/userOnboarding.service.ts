import { Service } from 'typedi';
import { In } from '@n8n/typeorm';

import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { UserService } from '@/services/user.service';

@Service()
export class UserOnboardingService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userService: UserService,
	) {}

	/**
	 * Check if user owns more than 15 workflows or more than 2 workflows with at least 2 nodes.
	 * If user does, set flag in its settings.
	 */
	async isBelowThreshold(user: User): Promise<boolean> {
		let belowThreshold = true;
		const skippedTypes = ['n8n-nodes-base.start', 'n8n-nodes-base.stickyNote'];

		const ownedWorkflowsIds = await this.sharedWorkflowRepository
			.find({
				where: {
					project: {
						projectRelations: {
							role: 'project:personalOwner',
							userId: user.id,
						},
					},
					role: 'workflow:owner',
				},
				select: ['workflowId'],
			})
			.then((ownedWorkflows) => ownedWorkflows.map(({ workflowId }) => workflowId));

		if (ownedWorkflowsIds.length > 15) {
			belowThreshold = false;
		} else {
			// just fetch workflows' nodes to keep memory footprint low
			const workflows = await this.workflowRepository.find({
				where: { id: In(ownedWorkflowsIds) },
				select: ['nodes'],
			});

			// valid workflow: 2+ nodes without start node
			const validWorkflowCount = workflows.reduce((counter, workflow) => {
				if (counter <= 2 && workflow.nodes.length > 2) {
					const nodes = workflow.nodes.filter((node) => !skippedTypes.includes(node.type));
					if (nodes.length >= 2) {
						return counter + 1;
					}
				}
				return counter;
			}, 0);

			// more than 2 valid workflows required
			belowThreshold = validWorkflowCount <= 2;
		}

		// user is above threshold --> set flag in settings
		if (!belowThreshold) {
			void this.userService.updateSettings(user.id, { isOnboarded: true });
		}

		return belowThreshold;
	}
}
