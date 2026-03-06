import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { PackageSubWorkflowRequirement } from '../import-export.types';
import type { RequirementResolver, ResolveContext } from '../requirement-resolver';

/**
 * Resolves sub-workflow requirements by checking if the workflow ID
 * exists on the target instance. This is the default strategy.
 */
@Service()
export class SubWorkflowResolver implements RequirementResolver<PackageSubWorkflowRequirement> {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async resolve(
		requirement: PackageSubWorkflowRequirement,
		_context: ResolveContext,
	): Promise<string | null> {
		const exists = await this.workflowRepository.findOne({
			select: { id: true },
			where: { id: requirement.id },
		});
		return exists?.id ?? null;
	}
}
