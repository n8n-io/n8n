import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import type { AgentsService } from '@/modules/agents/agents.service';
import { ProjectService } from '@/services/project.service.ee';

import { AgentRequirementsExtractor } from './agent-requirements.extractor';
import { AgentSerializer } from './agent.serializer';
import { applyAgentVersionPolicy, type AgentExportSource } from './agent-version-policy';
import { packageDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
	type ExportPackageRequest,
} from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageAgentRequirement } from '../../spec/requirements.schema';
import {
	assertEveryRequestedEntityAccessible,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '../package-export.errors';
import { ProjectSerializer } from '../project/project.serializer';
import { addRequirementUsage } from '../requirement-source';
import { mergeRequirements, type WorkflowExportRequirements } from '../requirements.types';
import type { WorkflowExportOrigin } from '../workflow/auto-included-workflow-resolver';
import type { AgentWorkflowRequirement } from '../workflow/workflow.types';

interface AgentExportResult {
	entries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	projectTargetsById: Map<string, string>;
	requirements: WorkflowExportRequirements;
	agentRequirements: PackageAgentRequirement[];
	workflowRequirements: AgentWorkflowRequirement[];
	workflowOrigins: Map<string, Set<WorkflowExportOrigin>>;
}

@Service()
export class AgentExporter {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly serializer: AgentSerializer,
		private readonly requirementsExtractor: AgentRequirementsExtractor,
		private readonly projectService: ProjectService,
		private readonly projectSerializer: ProjectSerializer,
	) {}

	async export(
		request: ExportPackageRequest,
		writer: PackageWriter,
		projects: ManifestEntry[],
	): Promise<AgentExportResult> {
		const result: AgentExportResult = {
			entries: [],
			projectEntries: [],
			projectTargetsById: new Map(projects.map(({ id, target }) => [id, target])),
			requirements: mergeRequirements(),
			agentRequirements: [],
			workflowRequirements: [],
			workflowOrigins: new Map(),
		};
		const selectedProjectAgents =
			request.projectAgentIds ?? (request.projectWorkflowIds === undefined ? undefined : []);
		const hasAgentSelection = Boolean(request.agentIds?.length || selectedProjectAgents?.length);
		if (!hasAgentSelection && (!request.projectIds?.length || selectedProjectAgents?.length === 0))
			return result;
		if (!this.moduleRegistry.isActive('agents')) {
			if (hasAgentSelection)
				throw new PackageExportBlockedError(
					'The agents module is disabled. Agent export is not available.',
				);
			return result;
		}
		// Workflow exports must not construct agent services when the module is disabled.
		const { AgentsService: ServiceClass } = await import('@/modules/agents/agents.service.js');
		const service = Container.get(ServiceClass);
		const rootIds = await this.rootAgentIds(request, selectedProjectAgents, service);
		const policy = request.agentVersionPolicy ?? WorkflowVersionPolicy.Latest;
		const roots = await this.loadSources(rootIds, request.user, policy, service);
		const { sources, requirements } = await this.resolveDependencies(roots, request, service);
		result.agentRequirements = requirements;
		for (const source of sources) {
			const extracted = await this.requirementsExtractor.extract(source, request.user);
			const scope = await this.projectTarget(source, request, writer, result);
			const tasks = await service.getTaskDefinitions(source.id, source.taskVersionId);
			result.entries.push(
				await this.serializer.write(writer, packageDirectory('agents', scope), source, tasks),
			);
			result.requirements = mergeRequirements(result.requirements, extracted.requirements);
			result.workflowRequirements.push(...extracted.workflows);
			for (const { referencedWorkflowId } of extracted.workflows) {
				result.workflowOrigins.set(
					referencedWorkflowId,
					new Set([scope ? 'project' : 'top-level']),
				);
			}
		}
		return result;
	}

	private async rootAgentIds(
		request: ExportPackageRequest,
		selection: string[] | undefined,
		service: AgentsService,
	): Promise<string[]> {
		const ids = new Set(request.agentIds ?? []);
		const projectIds = request.projectIds ?? [];
		const projectAgentIds = (
			await Promise.all(
				projectIds.map(async (projectId) => await service.findIdsInProject(projectId)),
			)
		).flat();
		if (selection !== undefined) {
			const members = new Set(projectAgentIds);
			if (selection.some((id) => !members.has(id)))
				throw new PackageEntityNotFoundError(
					'An agent is not in the requested projects. Export aborted.',
				);
		}
		for (const id of selection ?? projectAgentIds) ids.add(id);
		return [...ids];
	}

	private async loadSources(
		ids: string[],
		user: User,
		policy: WorkflowVersionPolicy,
		service: AgentsService,
	): Promise<AgentExportSource[]> {
		const agents = await service.findByIdsForUser(ids, user, ['agent:export']);
		await assertEveryRequestedEntityAccessible(
			'agent',
			ids,
			agents,
			async (missing) => await service.findExistingIds(missing),
		);
		const selected = new Map(
			applyAgentVersionPolicy(agents, policy).map((agent) => [agent.id, agent]),
		);
		return [...new Set(ids)].flatMap((id) => {
			const agent = selected.get(id);
			return agent ? [{ ...agent, schema: structuredClone(agent.schema) }] : [];
		});
	}

	private async resolveDependencies(
		roots: AgentExportSource[],
		request: ExportPackageRequest,
		service: AgentsService,
	) {
		const policy = request.missingAgentDependencyPolicy ?? MissingWorkflowDependencyPolicy.Fail;
		const sources = new Map(roots.map((source) => [source.id, source]));
		const requirements = new Map<string, PackageAgentRequirement>();
		let pending = roots;
		const visited = new Set(roots.map(({ id }) => id));
		while (pending.length > 0) {
			const missing = new Set<string>();
			for (const source of pending) {
				for (const { agentId } of source.schema?.subAgents?.agents ?? []) {
					const usage = requirements.get(agentId) ?? { id: agentId, usedByWorkflows: [] };
					addRequirementUsage(usage, { agentId: source.id, projectId: source.projectId });
					requirements.set(agentId, usage);
					if (!visited.has(agentId)) missing.add(agentId);
				}
			}
			if (policy !== MissingWorkflowDependencyPolicy.IncludeInPackage || missing.size === 0) break;
			for (const id of missing) visited.add(id);
			pending = await this.loadSources(
				[...missing],
				request.user,
				request.agentVersionPolicy ?? WorkflowVersionPolicy.Latest,
				service,
			);
			for (const source of pending) sources.set(source.id, source);
		}
		const missingIds = [...requirements.keys()].filter((id) => !sources.has(id));
		if (missingIds.length > 0 && policy !== MissingWorkflowDependencyPolicy.ReferenceOnly) {
			throw new PackageExportBlockedError(
				`${missingIds.length} agent dependencies not included in the package. Export aborted.`,
				{
					description: `Agent IDs not included in the package: ${missingIds.slice(0, 20).join(', ')}`,
				},
			);
		}
		const names = new Map([...sources].map(([id, source]) => [id, source.name]));
		for (const agent of await service.findByIdsForUser(missingIds, request.user, ['agent:export']))
			names.set(agent.id, agent.name);
		return {
			sources: [...sources.values()],
			requirements: [...requirements.values()].map((requirement) => ({
				...requirement,
				...(names.has(requirement.id) ? { name: names.get(requirement.id) } : {}),
			})),
		};
	}

	private async projectTarget(
		source: AgentExportSource,
		request: ExportPackageRequest,
		writer: PackageWriter,
		result: AgentExportResult,
	): Promise<string | undefined> {
		if (!request.projectIds?.length) return undefined;
		const existing = result.projectTargetsById.get(source.projectId);
		if (existing) return existing;
		const projects = await this.projectService.findProjectsByIdsForUser(
			request.user,
			[source.projectId],
			['project:export'],
		);
		await assertEveryRequestedEntityAccessible(
			'project',
			[source.projectId],
			projects,
			async (ids) => await this.projectService.findExistingProjectIds(ids),
		);
		const project = projects[0];
		const entry = await writeManifestEntry(
			writer,
			'projects',
			packageDirectory('projects'),
			project,
			this.projectSerializer.serialize(project),
		);
		result.projectEntries.push(entry);
		result.projectTargetsById.set(project.id, entry.target);
		return entry.target;
	}
}
