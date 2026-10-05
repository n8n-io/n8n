import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	AGENT_CONFIG_ID_KEYS,
	extractAgentCredentialIds,
} from '@/modules/agents/utils/extract-agent-credential-ids';
import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExportSource } from './agent-version-policy';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import { getStaticSubworkflowId } from '../workflow/references/sub-workflow-node.reference';
import type { AgentWorkflowRequirement } from '../workflow/workflow.types';
import type { WorkflowExportRequirements } from '../requirements.types';
import { PackageExportBlockedError } from '../package-export.errors';

@Service()
export class AgentRequirementsExtractor {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly credentials: CredentialRequirementsExtractor,
		private readonly dataTables: DataTableRequirementsExtractor,
		private readonly variables: VariableRequirementsExtractor,
	) {}

	async extract(
		agent: AgentExportSource,
		user: User,
	): Promise<{
		requirements: WorkflowExportRequirements;
		workflows: AgentWorkflowRequirement[];
	}> {
		const source = { agentId: agent.id, projectId: agent.projectId };
		const nodes = (agent.schema?.tools ?? [])
			.filter((tool) => tool.type === 'node')
			.map(({ node }) => ({
				type: node.nodeType,
				typeVersion: node.nodeTypeVersion,
				parameters: node.nodeParameters,
				credentials: node.credentials,
			}));
		const nodeSource = { id: agent.id, nodes };
		const nodeCredentials = this.credentials.extract(nodeSource);
		const credentialIds = new Set([
			...extractAgentCredentialIds(agent.schema, AGENT_CONFIG_ID_KEYS),
			...extractAgentCredentialIds(agent.integrations),
			...extractAgentCredentialIds(nodeCredentials),
		]);
		const metadataById = new Map(
			nodeCredentials.map((credential) => [credential.credentialId, credential]),
		);
		const workflowIds = new Set(await this.resolveWorkflowTools(agent, user));
		for (const node of nodes) {
			const id = getStaticSubworkflowId(node);
			if (id) workflowIds.add(id);
		}
		return {
			workflows: [...workflowIds].map((referencedWorkflowId) => ({
				...source,
				referencedWorkflowId,
			})),
			requirements: {
				credentials: [...credentialIds].map((credentialId) => ({
					...source,
					credentialId,
					credentialName: metadataById.get(credentialId)?.credentialName,
					credentialType: metadataById.get(credentialId)?.credentialType,
				})),
				dataTables: this.dataTables
					.extract(nodeSource)
					.map(({ dataTableId }) => ({ ...source, dataTableId })),
				variables: this.variables
					.extract(nodeSource)
					.map(({ variableName }) => ({ ...source, variableName })),
				tags: [],
				nodeTypes: [{ ...source, nodes }],
			},
		};
	}

	private async resolveWorkflowTools(agent: AgentExportSource, user: User): Promise<string[]> {
		if (!agent.schema) return [];
		const refs = extractAgentWorkflowRefs(agent.schema);
		const legacyValues = refs.flatMap((ref) =>
			ref.workflowId === undefined ? [ref.workflow] : [],
		);
		const workflows = await this.workflowFinder.findWorkflowsByNamesOrIdsInProjectForUser(
			user,
			agent.projectId,
			legacyValues,
			['workflow:export'],
		);
		const byName = new Map(workflows.map((workflow) => [workflow.name, workflow.id]));
		const byId = new Map(workflows.map((workflow) => [workflow.id, workflow.id]));
		return refs.map((ref) => {
			const id = ref.workflowId ?? byName.get(ref.workflow) ?? byId.get(ref.workflow);
			if (!id)
				throw new PackageExportBlockedError(
					`Agent "${agent.id}" has a workflow tool that cannot be resolved: "${ref.workflow}". Export aborted.`,
				);
			// Only the export snapshot changes. The package carries a stable dependency ID.
			ref.workflowId = id;
			return id;
		});
	}
}
