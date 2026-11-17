import type { PromotionResourceWarning } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { DataTableService } from '@n8n/backend-module-data-table';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import {
	findCrossProjectResources,
	type CrossProjectResource,
} from '@/modules/n8n-packages/entities/cross-project-resources';
import { DataTableRequirementsExtractor } from '@/modules/n8n-packages/entities/data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import type { CheckSelection } from './promote-check-facts.service';
import { TargetLookupService } from './target-lookup.service';
import { PromotionAccessService } from '../promotion-access.service';

type Consumer = { id: string; name: string; projectId: string };

/**
 * Finds the data tables and the project variables that a workflow of the operation uses and
 * that another project owns. A data table and a project variable cannot cross a project, so
 * such a reference does not resolve on the source either. It is a warning: the operation
 * continues and does not copy the resource.
 */
@Service()
export class ResourceWarningsService {
	constructor(
		private readonly lookup: TargetLookupService,
		private readonly access: PromotionAccessService,
		private readonly projectRepository: ProjectRepository,
		private readonly dataTableService: DataTableService,
		private readonly variablesService: VariablesService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly dataTableExtractor: DataTableRequirementsExtractor,
		private readonly variableExtractor: VariableRequirementsExtractor,
	) {}

	/** Promote: reads the workflows of the selection and the owners on this instance. */
	async forPromote(
		user: User,
		selection: readonly CheckSelection[],
	): Promise<PromotionResourceWarning[]> {
		const projectOf = new Map<string, string>();
		for (const { projectId, workflowIds = [] } of selection) {
			for (const id of workflowIds) projectOf.set(id, projectId);
		}
		if (projectOf.size === 0) return [];
		const workflows = await this.lookup.workflows([...projectOf.keys()], true);

		const tableUses: Array<{ consumer: Consumer; tableId: string }> = [];
		const variableUses: Array<{ consumer: Consumer; name: string }> = [];
		for (const workflow of workflows.values()) {
			const projectId = projectOf.get(workflow.id);
			if (projectId === undefined) continue;
			const consumer = { id: workflow.id, name: workflow.name, projectId };
			const source = { id: workflow.id, nodes: workflow.nodes ?? [], settings: workflow.settings };
			for (const { dataTableId } of this.dataTableExtractor.extract(source)) {
				tableUses.push({ consumer, tableId: dataTableId });
			}
			for (const { variableName } of this.variableExtractor.extract(source)) {
				variableUses.push({ consumer, name: variableName });
			}
		}

		const found: Array<CrossProjectResource & { consumerName: string }> = [];
		if (tableUses.length > 0 && this.moduleRegistry.isActive('data-table')) {
			const tables = await this.dataTableService.findDataTablesByIds([
				...new Set(tableUses.map(({ tableId }) => tableId)),
			]);
			const tableById = new Map(tables.map((table) => [table.id, table]));
			for (const { consumer, tableId } of tableUses) {
				const table = tableById.get(tableId);
				// A table that does not exist is a broken node, not a table of another project.
				if (!table || table.projectId === consumer.projectId) continue;
				found.push({
					kind: 'dataTable',
					id: table.id,
					name: table.name,
					consumerWorkflowId: consumer.id,
					consumerName: consumer.name,
					consumerProjectId: consumer.projectId,
					ownerProjectId: table.projectId,
				});
			}
		}
		if (variableUses.length > 0) {
			const variables = await this.variablesService.getAllCached();
			for (const { consumer, name } of variableUses) {
				const candidates = variables.filter(({ key }) => key === name);
				// The project of the workflow reads its own variable first, then a global one.
				const resolves = candidates.some(
					({ project }) => !project || project.id === consumer.projectId,
				);
				const owner = candidates.find(({ project }) => project)?.project;
				if (resolves || !owner) continue;
				found.push({
					kind: 'variable',
					name,
					consumerWorkflowId: consumer.id,
					consumerName: consumer.name,
					consumerProjectId: consumer.projectId,
					ownerProjectId: owner.id,
				});
			}
		}
		return await this.toWarnings(user, found);
	}

	/** Apply: reads the branch. The folder of a file names the owner of the resource. */
	async forApply(
		user: User,
		manifest: PackageManifest,
		selection: readonly CheckSelection[] | 'instance',
	): Promise<PromotionResourceWarning[]> {
		const written =
			selection === 'instance'
				? null
				: new Set(selection.flatMap(({ workflowIds = [] }) => workflowIds));
		const names = new Map((manifest.workflows ?? []).map(({ id, name }) => [id, name]));
		const found = findCrossProjectResources(manifest)
			.filter(({ consumerWorkflowId }) => !written || written.has(consumerWorkflowId))
			.map((resource) => ({
				...resource,
				consumerName: names.get(resource.consumerWorkflowId) ?? resource.consumerWorkflowId,
			}));
		return await this.toWarnings(
			user,
			found,
			new Map((manifest.projects ?? []).map(({ id, name }) => [id, name])),
		);
	}

	/**
	 * A warning names the owner project, and the name of a data table, only when the user can
	 * read the owner project on this instance. The name of a variable is in the workflow.
	 */
	private async toWarnings(
		user: User,
		found: Array<CrossProjectResource & { consumerName: string }>,
		branchProjectNames: ReadonlyMap<string, string> = new Map(),
	): Promise<PromotionResourceWarning[]> {
		if (found.length === 0) return [];
		const ownerIds = [...new Set(found.flatMap(({ ownerProjectId }) => ownerProjectId ?? []))];
		const [readable, projects] = await Promise.all([
			this.access.readableProjectIds(user, ownerIds),
			this.projectRepository.findTeamProjectInfoByIds(ownerIds),
		]);
		const projectNames = new Map(projects.map(({ id, name }) => [id, name]));

		const seen = new Set<string>();
		return found.flatMap((resource): PromotionResourceWarning[] => {
			const { kind, id, name, consumerWorkflowId, consumerName, consumerProjectId } = resource;
			const key = `${kind}|${id ?? name}|${consumerWorkflowId}`;
			if (seen.has(key)) return [];
			seen.add(key);
			const ownerId = resource.ownerProjectId;
			const ownerName =
				ownerId !== undefined && readable.has(ownerId)
					? (projectNames.get(ownerId) ?? branchProjectNames.get(ownerId))
					: undefined;
			const project =
				ownerId !== undefined && ownerName !== undefined ? { id: ownerId, name: ownerName } : null;
			return [
				{
					code: kind === 'dataTable' ? 'data-table-of-other-project' : 'variable-of-other-project',
					consumer: {
						kind: 'workflow',
						id: consumerWorkflowId,
						name: consumerName,
						projectId: consumerProjectId,
					},
					resource: {
						kind,
						...(id !== undefined ? { id } : {}),
						// The row of a table that the promoting user could not read holds the id as its name.
						...(kind === 'variable' || (project && name !== id) ? { name } : {}),
						...(project ? { project } : {}),
					},
				},
			];
		});
	}
}
