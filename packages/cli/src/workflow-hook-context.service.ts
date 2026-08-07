import { TagRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isTriggerNode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

/**
 * Exposes methods for common helpers to use in workflow lifecycle hooks.
 */
@Service()
export class WorkflowHookContextService {
	constructor(
		private readonly tagRepository: TagRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	async getWorkflowTags(workflowId: string): Promise<string[]> {
		const tags = await this.tagRepository.find({
			where: { workflows: { id: workflowId } },
			select: { name: true },
		});

		return tags.map(({ name }) => name);
	}

	/**
	 * Determines whether the given node type is a trigger.
	 *
	 * @param type - Fully-qualified node type name (e.g. `n8n-nodes-base.manualTrigger`).
	 * @param typeVersion - Node type version to resolve; defaults to the latest registered version.
	 * @returns `true` if the resolved node type is a trigger, `false` otherwise —
	 * including when the node type cannot be resolved, e.g. it is not registered
	 * on this instance.
	 */
	resolveIsTriggerNodeType(type: string, typeVersion?: number): boolean {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(type, typeVersion);
			return isTriggerNode(description);
		} catch {
			return false;
		}
	}
}
