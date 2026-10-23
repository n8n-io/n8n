import { ModuleRegistry } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import type { Project } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { ProjectService } from '@/services/project.service.ee';

import type {
	AgentExportRequirements,
	AgentSelectionExportRequest,
	AgentSelectionExportResult,
	PreparedAgentExport,
} from './agent-export.types';
import { AgentRequirementsExtractor } from './agent-requirements.extractor';
import type { AgentExporter } from './agent.exporter';
import { ExportDependencyPolicy, ExportVersionPolicy } from '../../n8n-packages.types';
import type { PackageAgentRequirement } from '../../spec/requirements.schema';
import {
	assertEveryRequestedEntityAccessible,
	PackageExportBlockedError,
} from '../package-export.errors';
import { findExportableProjects } from '../project/project-export-access';
import { ProjectShellExporter } from '../project/project-shell.exporter';
import { addRequirementUsage } from '../requirement-source';
import { mergeRequirements } from '../requirements.types';
import { needsActiveVersion } from '../workflow/workflow-version-policy';

interface PreparedSelection {
	snapshot: PreparedAgentExport;
	requirements: AgentExportRequirements;
}

@Service()
export class AgentSelectionExporter {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly projectScopeService: ProjectScopeService,
		private readonly projectService: ProjectService,
		private readonly projectShellExporter: ProjectShellExporter,
		private readonly requirementsExtractor: AgentRequirementsExtractor,
	) {}

	async export(request: AgentSelectionExportRequest): Promise<AgentSelectionExportResult> {
		const result: AgentSelectionExportResult = {
			agentEntries: [],
			projectEntries: [],
			projectTargetsById: new Map(request.projectTargetsById),
			requirements: mergeRequirements(),
			workflowRequirements: [],
			agentRequirements: [],
			agentIds: [],
			counts: { agents: 0 },
		};
		const projectIds = request.projectIds ?? [];
		const agentIds = request.agentIds ?? [];
		if (
			agentIds.length === 0 &&
			(projectIds.length === 0 || request.projectWorkflowIds !== undefined)
		) {
			return result;
		}
		if (!this.moduleRegistry.isActive('agents')) {
			if (agentIds.length > 0) {
				throw new PackageExportBlockedError(
					'Agents cannot be exported because the agents module is disabled.',
				);
			}
			return result;
		}

		// Existing project targets have already passed project export authorization.
		const selectedProjects = await findExportableProjects(
			this.projectService,
			request.user,
			projectIds.filter((id) => !result.projectTargetsById.has(id)),
		);
		// Resolve Agent services only after the module check.
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		const { AgentExporter } = await import('./agent.exporter.js');
		const exporter = Container.get(AgentExporter);
		const prepared = await this.prepareSelection(request, Container.get(AgentRepository), exporter);
		this.assertAgentDependenciesIncluded(request, prepared);

		if (projectIds.length > 0) {
			await this.addProjectShells(request, prepared, result, selectedProjects);
		}
		for (const { snapshot } of prepared) {
			const prefix = projectIds.length > 0 ? result.projectTargetsById.get(snapshot.projectId) : '';
			result.agentEntries.push(await exporter.write(snapshot, request.writer, prefix));
		}
		result.requirements = mergeRequirements(...prepared.map(({ requirements }) => requirements));
		result.workflowRequirements = prepared.flatMap(({ requirements }) => requirements.workflows);
		result.agentRequirements = this.collectAgentRequirements(prepared);
		result.agentIds = result.agentEntries.map(({ id }) => id);
		result.counts.agents = result.agentEntries.length;
		return result;
	}

	private async prepareSelection(
		request: AgentSelectionExportRequest,
		repository: AgentRepository,
		exporter: AgentExporter,
	): Promise<PreparedSelection[]> {
		const projectIds = request.projectIds ?? [];
		const projectAgentIds = await repository.findIdsInProjectsForExport(projectIds);
		const pending = [...new Set([...(request.agentIds ?? []), ...projectAgentIds])];
		const seen = new Set(pending);
		const prepared: PreparedSelection[] = [];
		const exportableProjects = await this.projectScopeService.getProjectIds(request.user, [
			'agent:export',
		]);
		const policy = request.versionPolicy ?? ExportVersionPolicy.Latest;
		while (pending.length > 0) {
			const ids = pending.splice(0);
			const agents = await repository.findForExport(ids, exportableProjects, {
				includeActiveVersion: needsActiveVersion(policy),
			});
			await assertEveryRequestedEntityAccessible(
				'Agent',
				ids,
				agents,
				async (missingIds) => await repository.findExistingIds(missingIds),
			);
			const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
			for (const id of ids) {
				const agent = agentsById.get(id);
				if (!agent) continue;
				const snapshot = await exporter.prepare(agent, policy);
				if (!snapshot) continue;
				const requirements = this.requirementsExtractor.extract(
					snapshot,
					projectIds.length > 0 ? 'project' : 'top-level',
				);
				prepared.push({ snapshot, requirements });
				if (request.dependencyPolicy !== ExportDependencyPolicy.IncludeInPackage) continue;
				this.enqueueDependencies(requirements.agentIds, seen, pending);
			}
		}
		return prepared;
	}

	private enqueueDependencies(ids: string[], seen: Set<string>, pending: string[]): void {
		for (const id of ids) {
			if (seen.has(id)) continue;
			seen.add(id);
			pending.push(id);
		}
	}

	private assertAgentDependenciesIncluded(
		request: AgentSelectionExportRequest,
		prepared: PreparedSelection[],
	): void {
		if (request.dependencyPolicy === ExportDependencyPolicy.ReferenceOnly) return;
		const included = new Set(prepared.map(({ snapshot }) => snapshot.content.id));
		for (const { snapshot, requirements } of prepared) {
			const missing = requirements.agentIds.filter((id) => !included.has(id));
			if (missing.length === 0) continue;
			throw new PackageExportBlockedError(
				`Agent "${snapshot.content.id}" has Agent dependencies not included in the package. Export aborted.`,
				{
					description: `Agent IDs not included in the package: ${missing.slice(0, 20).join(', ')}`,
				},
			);
		}
	}

	private async addProjectShells(
		request: AgentSelectionExportRequest,
		prepared: PreparedSelection[],
		result: AgentSelectionExportResult,
		selectedProjects: Project[],
	): Promise<void> {
		const projectIds = new Set(
			prepared
				.map(({ snapshot }) => snapshot.projectId)
				.filter((id) => !result.projectTargetsById.has(id)),
		);
		if (projectIds.size === 0) return;
		const selectedProjectIds = new Set(selectedProjects.map(({ id }) => id));
		const dependencyProjects = await findExportableProjects(
			this.projectService,
			request.user,
			[...projectIds].filter((id) => !selectedProjectIds.has(id)),
		);
		const context = {
			writer: request.writer,
			projectEntries: result.projectEntries,
			projectTargetsById: result.projectTargetsById,
		};
		for (const project of [...selectedProjects, ...dependencyProjects]) {
			if (projectIds.has(project.id)) await this.projectShellExporter.export(project, context);
		}
	}

	private collectAgentRequirements(prepared: PreparedSelection[]): PackageAgentRequirement[] {
		const names = new Map(
			prepared.map(({ snapshot }) => [snapshot.content.id, snapshot.content.name]),
		);
		const byId = new Map<string, PackageAgentRequirement>();
		for (const { snapshot, requirements } of prepared) {
			for (const id of requirements.agentIds) {
				const requirement = byId.get(id) ?? {
					id,
					...(names.has(id) ? { name: names.get(id) } : {}),
					usedBy: [],
				};
				addRequirementUsage(requirement, {
					agentId: snapshot.content.id,
					projectId: snapshot.projectId,
				});
				byId.set(id, requirement);
			}
		}
		return [...byId.values()];
	}
}
