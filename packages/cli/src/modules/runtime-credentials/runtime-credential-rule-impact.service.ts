import type {
	RuntimeCredentialRuleImpact,
	RuntimeCredentialRuleImpactWorkflow,
} from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { findReadingNodes, longestLiteral } from './rule-impact-matcher';

const MAX_WORKFLOWS = 100;
const MAX_NODE_NAMES = 20;
const PAGE_SIZE = 100;
/** Upper bound on the workflows that one request reads. */
const MAX_SCANNED_WORKFLOWS = 5000;

/**
 * Finds the workflows that read a value which a rule removes from the trigger output.
 * The result is a hint for the admin: it can show a workflow that does not break, and it
 * can miss a read that an expression builds at run time.
 */
@Service()
export class RuntimeCredentialRuleImpactService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async findAffectedWorkflows(
		nodeType: string,
		path: string,
	): Promise<RuntimeCredentialRuleImpact> {
		const workflows: RuntimeCredentialRuleImpactWorkflow[] = [];
		const nodesContain = longestLiteral(path);
		let afterId: string | undefined;
		let scanned = 0;

		while (scanned < MAX_SCANNED_WORKFLOWS) {
			const page = await this.workflowRepository.findNodesPageForImpactScan({
				afterId,
				limit: PAGE_SIZE,
				nodesContain,
				triggerNodeTypes: nodeType === '*' ? undefined : [nodeType],
			});

			for (const workflow of page) {
				const nodeNames = findReadingNodes(workflow.nodes, workflow.connections, nodeType, path);
				if (nodeNames.length === 0) continue;
				// A match after the limit proves that the list is not complete.
				if (workflows.length === MAX_WORKFLOWS) return { workflows, truncated: true };
				workflows.push({
					id: workflow.id,
					name: workflow.name,
					projectId: workflow.projectId,
					projectName: workflow.projectName,
					nodeNames: nodeNames.slice(0, MAX_NODE_NAMES),
				});
			}

			if (page.length < PAGE_SIZE) return { workflows, truncated: false };
			afterId = page[page.length - 1].id;
			scanned += page.length;
		}

		return { workflows, truncated: true };
	}
}
