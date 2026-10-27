import { Service } from '@n8n/di';

import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';

import type { AgentExportRequirements, PreparedAgentExport } from './agent-export.types';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import { PackageExportBlockedError } from '../package-export.errors';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import { getStaticSubworkflowId } from '../workflow/references/sub-workflow-node.reference';
import type { AgentWorkflowRequirement } from '../workflow/workflow.types';

@Service()
export class AgentRequirementsExtractor {
	constructor(
		private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor,
		private readonly dataTables: DataTableRequirementsExtractor,
		private readonly variables: VariableRequirementsExtractor,
	) {}

	extract(
		{ content, projectId }: PreparedAgentExport,
		origin: AgentWorkflowRequirement['origin'] = 'top-level',
	): AgentExportRequirements {
		const config = content.config;
		const source = { agentId: content.id, projectId };
		const nodeTools = (config?.tools ?? []).filter((tool) => tool.type === 'node');
		const nodes = nodeTools.map(({ node }) => ({
			type: node.nodeType,
			typeVersion: node.nodeTypeVersion,
			parameters: node.nodeParameters,
		}));
		const workflowIds = new Set(
			extractAgentWorkflowRefs(config).map((tool) => {
				if (!tool.workflowId) {
					throw new PackageExportBlockedError(
						`Agent "${content.id}" workflow tool "${tool.workflow}" has no workflow ID. Export aborted.`,
					);
				}
				return tool.workflowId;
			}),
		);
		for (const node of nodes) {
			const id = getStaticSubworkflowId(node);
			if (id) workflowIds.add(id);
		}
		return {
			credentials: this.credentialRequirementsExtractor
				.extractFromAgent(config)
				.map((reference) => ({
					...source,
					...reference,
				})),
			dataTables: this.dataTables
				.extractIds(nodes)
				.map((dataTableId) => ({ ...source, dataTableId })),
			variables: this.variables
				.extractNames({ nodes })
				.map((variableName) => ({ ...source, variableName })),
			tags: [],
			nodeTypes: nodes.length > 0 ? [{ ...source, nodes }] : [],
			workflows: [...workflowIds].map((referencedWorkflowId) => ({
				...source,
				referencedWorkflowId,
				origin,
			})),
			agentIds: [...new Set((config?.subAgents?.agents ?? []).map(({ agentId }) => agentId))],
		};
	}
}
