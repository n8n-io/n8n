import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { AgentsService } from '@/modules/agents/agents.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { composeJsonConfig } from '@/modules/agents/json-config/agent-config-composition';

import { AgentSerializer } from './agent.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import { PackageExportConfig } from '../../n8n-packages.config';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { SerializedAgentFile } from '../../spec/serialized/agent.schema';
import {
	assertEveryRequestedEntityAccessible,
	PackageExportBlockedError,
} from '../package-export.errors';

export interface AgentExportRequest {
	user: User;
	agentIds: string[];
	writer: PackageWriter;

	// Directory the agent is written under, e.g. `projects/{slug}`.
	basePrefix?: string;
}

export interface AgentExportResult {
	entries: ManifestEntry[];
	/** Workflows the exported agents use as tools; the caller bundles them as workflow entities. */
	referencedWorkflowIds: string[];
}

@Service()
export class AgentExporter {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly agentSerializer: AgentSerializer,
		private readonly exportConfig: PackageExportConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async export(request: AgentExportRequest): Promise<AgentExportResult> {
		if (!this.moduleRegistry.isActive('agents')) {
			throw new PackageExportBlockedError(
				'Cannot export agents: the agents module is not active on this instance.',
			);
		}

		const agents: Agent[] = [];
		for (const agentId of request.agentIds) {
			const agent = await this.agentsService.findByIdForUser(agentId, request.user);
			if (agent) agents.push(agent);
		}

		await assertEveryRequestedEntityAccessible(
			'agent',
			request.agentIds,
			agents,
			async (ids) => await this.agentsService.findExistingAgentIds(ids),
		);

		const entries: ManifestEntry[] = [];
		const referencedWorkflowIds = new Set<string>();
		const fileNames = new UniqueFilenameAllocator(
			request.basePrefix ? `${request.basePrefix}/agents` : 'agents',
			'agent',
		);

		for (const agent of agents) {
			const target = fileNames.allocate(agent.name);
			await request.writer.writeDirectory(target);

			const files = await this.exportKnowledgeFiles(agent, target, request.writer);
			const tasks = (await this.agentsService.getTasks(agent.id)).map(
				({ id, name, objective, cronExpression, timezone }) => ({
					id,
					name,
					objective,
					cronExpression,
					timezone,
				}),
			);

			const serialized = this.agentSerializer.serialize(agent, { tasks, files });
			await request.writer.writeFile(
				`${target}/agent.json`,
				JSON.stringify(serialized, null, '\t'),
			);

			entries.push({ id: agent.id, name: agent.name, target });

			for (const workflowId of workflowToolIds(agent)) {
				referencedWorkflowIds.add(workflowId);
			}
		}

		return { entries, referencedWorkflowIds: [...referencedWorkflowIds] };
	}

	/**
	 * Writes the agent's knowledge blobs under `<target>/files/` and returns their
	 * index for agent.json. File entries are named by position — the real file
	 * name stays in the index — so package paths never depend on user input.
	 */
	private async exportKnowledgeFiles(
		agent: Agent,
		target: string,
		writer: PackageWriter,
	): Promise<SerializedAgentFile[]> {
		const stored = await this.agentKnowledgeService.getFilesWithContent(agent.id);
		if (stored.length === 0) return [];

		const totalBytes = stored.reduce((total, { content }) => total + content.byteLength, 0);
		if (totalBytes > this.exportConfig.maxAgentKnowledgeBytes) {
			throw new PackageExportBlockedError(
				`Agent "${agent.name}" has ${totalBytes} bytes of knowledge files, above the export limit of ${this.exportConfig.maxAgentKnowledgeBytes} bytes (N8N_EXPORT_MAX_AGENT_KNOWLEDGE_BYTES).`,
			);
		}

		await writer.writeDirectory(`${target}/files`);

		const files: SerializedAgentFile[] = [];
		for (const [index, { file, content }] of stored.entries()) {
			const fileTarget = `${target}/files/file-${index + 1}`;
			await writer.writeFile(fileTarget, content);
			files.push({
				fileName: file.fileName,
				mimeType: file.mimeType,
				fileSizeBytes: file.fileSizeBytes,
				target: fileTarget,
			});
		}
		return files;
	}
}

function workflowToolIds(agent: Agent): string[] {
	const config = composeJsonConfig(agent);
	return (config?.tools ?? [])
		.filter((tool) => tool.type === 'workflow')
		.map((tool) => tool.workflowId)
		.filter((workflowId): workflowId is string => typeof workflowId === 'string');
}
