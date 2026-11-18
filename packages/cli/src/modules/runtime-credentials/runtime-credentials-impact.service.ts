import type { RuntimeCredentialRuleImpact } from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

const MAX_LISTED_WORKFLOWS = 20;

/**
 * Finds the workflows that read a field a rule would remove, so an admin sees what breaks
 * before saving the rule. A match is a hint, not proof: it means that a node of a workflow
 * with a matching trigger names the last two segments of the path.
 */
@Service()
export class RuntimeCredentialsImpactService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async findAffectedWorkflows(
		nodeType: string,
		path: string,
	): Promise<RuntimeCredentialRuleImpact> {
		const segments = path
			.split('.')
			.map((segment) => segment.replace(/\[\*\]$/, ''))
			.filter(Boolean);
		const field = segments.at(-1);
		if (!field) return { count: 0, workflows: [] };
		const parent = segments.at(-2);

		const workflows = await this.workflowRepository.find({
			select: { id: true, name: true, nodes: true },
			where: { isArchived: false },
		});

		const affected = workflows.filter(({ nodes }) => readsField(nodes, nodeType, field, parent));
		return {
			count: affected.length,
			workflows: affected.slice(0, MAX_LISTED_WORKFLOWS).map(({ id, name }) => ({ id, name })),
		};
	}
}

function readsField(nodes: INode[], nodeType: string, field: string, parent?: string) {
	const hasTrigger = nodeType === '*' || nodes.some((node) => node.type === nodeType);
	if (!hasTrigger) return false;

	return nodes.some((node) => {
		const parameters = JSON.stringify(node.parameters ?? {});
		return parameters.includes(field) && (!parent || parameters.includes(parent));
	});
}
