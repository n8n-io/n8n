import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { AgentsService } from '@/modules/agents/agents.service';

import { rebindAgentConfig } from './agent-reference-rebinding';
import type {
	AgentImportPlan,
	AgentImportRequest,
	AgentResolutionFailure,
	PreparedAgent,
} from './agent.types';
import type {
	ImportContext,
	ImportedAgentSummary,
	PackageImportBindings,
} from '../../n8n-packages.types';

/**
 * Package agents keep their source id on the target — sub-agent and MCP
 * references address agents by id, so a minted id would strand them. An
 * occupied id in the target project blocks the import.
 */
@Service()
export class AgentImporter {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async plan(context: ImportContext, request: AgentImportRequest): Promise<AgentImportPlan> {
		if (request.agents.length === 0) return { creations: [], failures: [] };

		if (!this.moduleRegistry.isActive('agents')) {
			return {
				creations: [],
				failures: [{ kind: 'module-disabled' }],
			};
		}

		const existingIds = new Set(
			(await this.agentsService.findByProjectId(context.projectId)).map(({ id }) => id),
		);

		const creations: PreparedAgent[] = [];
		const failures: AgentResolutionFailure[] = [];
		for (const agent of request.agents) {
			if (existingIds.has(agent.sourceAgentId)) {
				failures.push({ kind: 'id-exists', sourceId: agent.sourceAgentId, name: agent.name });
			} else {
				creations.push(agent);
			}
		}

		return { creations, failures };
	}

	async apply(
		context: ImportContext,
		plan: AgentImportPlan,
		bindings: PackageImportBindings,
	): Promise<ImportedAgentSummary[]> {
		const summaries: ImportedAgentSummary[] = [];

		for (const agent of plan.creations) {
			const config = agent.config ? rebindAgentConfig(agent.config, bindings) : undefined;

			const created = await this.agentsService.create(context.projectId, agent.name, {
				id: agent.sourceAgentId,
				availableInMCP: agent.availableInMCP,
				...(config ? { schema: config } : {}),
				skills: agent.skills,
				tools: agent.tools,
				tasks: agent.tasks,
			});

			for (const file of agent.files) {
				await this.agentKnowledgeService.importFile(
					created.id,
					{
						fileName: file.fileName,
						mimeType: file.mimeType,
						fileSizeBytes: file.fileSizeBytes,
					},
					file.content,
				);
			}

			summaries.push({
				sourceAgentId: agent.sourceAgentId,
				localId: created.id,
				name: created.name,
				status: 'created',
				files: agent.files.length,
			});
		}

		return summaries;
	}
}
