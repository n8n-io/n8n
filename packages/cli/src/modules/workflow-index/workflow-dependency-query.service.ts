import type {
	DependenciesBatchResponse,
	DependencyCountsBatchResponse,
	DependencyResourceType,
	ResolvedDependency,
} from '@n8n/api-types';
import {
	CredentialsRepository,
	ProjectRelationRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

interface RawDepMaps {
	credMap: Map<string, Set<string>>;
	dtMap: Map<string, Set<string>>;
	subMap: Map<string, Set<string>>;
	parentMap: Map<string, Set<string>>;
	allCredIds: Set<string>;
	allWfIds: Set<string>;
	allDtIds: Set<string>;
}

@Service()
export class WorkflowDependencyQueryService {
	constructor(
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
	) {}

	async getDependencyCounts(
		resourceIds: string[],
		resourceType: DependencyResourceType,
		user: User,
	): Promise<DependencyCountsBatchResponse> {
		const loaded = await this.loadDepsForResources(resourceIds, resourceType, user);
		if (!loaded) return {};

		const { accessibleInputIds, maps } = loaded;

		const result: DependencyCountsBatchResponse = {};
		for (const id of accessibleInputIds) {
			result[id] = {
				credentialId: maps.credMap.get(id)?.size ?? 0,
				dataTableId: maps.dtMap.get(id)?.size ?? 0,
				workflowCall: maps.subMap.get(id)?.size ?? 0,
				workflowParent: maps.parentMap.get(id)?.size ?? 0,
			};
		}
		return result;
	}

	/** Return resolved dependencies for each input resource, excluding inaccessible ones. */
	async getResourceDependencies(
		resourceIds: string[],
		resourceType: DependencyResourceType,
		user: User,
	): Promise<DependenciesBatchResponse> {
		const loaded = await this.loadDepsForResources(resourceIds, resourceType, user);
		if (!loaded) return {};

		const { accessibleInputIds, maps } = loaded;

		// Check user access for each dependency type
		const [accessibleWfIds, accessibleCredIds, accessibleDtIds] = await Promise.all([
			this.filterByAccess([...maps.allWfIds], 'workflow', user),
			this.filterByAccess([...maps.allCredIds], 'credential', user),
			this.filterByAccess([...maps.allDtIds], 'dataTable', user),
		]);

		// Only enrich names for accessible resources
		const [credentials, workflows, dataTables] = await Promise.all([
			accessibleCredIds.length > 0
				? this.credentialsRepository.find({
						where: { id: In(accessibleCredIds) },
						select: ['id', 'name'],
					})
				: [],
			accessibleWfIds.length > 0
				? this.workflowRepository.find({
						where: { id: In(accessibleWfIds) },
						select: ['id', 'name'],
					})
				: [],
			accessibleDtIds.length > 0
				? this.dataTableRepository.find({
						where: { id: In(accessibleDtIds) },
						select: ['id', 'name', 'projectId'],
					})
				: [],
		]);

		const wfNames = new Map<string, string>();
		const credNames = new Map<string, string>();
		const dtNames = new Map<string, { name: string; projectId: string }>();

		for (const c of credentials) credNames.set(c.id, c.name ?? c.id);
		for (const w of workflows) wfNames.set(w.id, w.name ?? w.id);
		for (const dt of dataTables)
			dtNames.set(dt.id, { name: dt.name ?? dt.id, projectId: dt.projectId });

		return this.buildEnrichedResult(accessibleInputIds, maps, {
			wfNames,
			credNames,
			dtNames,
		});
	}

	private async loadDepsForResources(
		resourceIds: string[],
		resourceType: DependencyResourceType,
		user: User,
	): Promise<{ accessibleInputIds: string[]; maps: RawDepMaps } | null> {
		const accessibleInputIds = await this.filterByAccess(resourceIds, resourceType, user);
		if (accessibleInputIds.length === 0) return null;

		const rawDeps = await this.dependencyRepository.find({
			where: [
				{
					workflowId: In(accessibleInputIds),
					dependencyType: In(['credentialId', 'dataTableId', 'workflowCall']),
				},
				{ dependencyKey: In(accessibleInputIds) },
			],
			select: ['workflowId', 'dependencyType', 'dependencyKey'],
		});

		if (rawDeps.length === 0) return null;

		return { accessibleInputIds, maps: this.buildDepMaps(rawDeps) };
	}

	private buildDepMaps(
		rawDeps: Array<{ workflowId: string; dependencyType: string; dependencyKey: string }>,
	): RawDepMaps {
		const credMap = new Map<string, Set<string>>();
		const dtMap = new Map<string, Set<string>>();
		const subMap = new Map<string, Set<string>>();
		const parentMap = new Map<string, Set<string>>();
		const allCredIds = new Set<string>();
		const allWfIds = new Set<string>();
		const allDtIds = new Set<string>();

		for (const dep of rawDeps) {
			allWfIds.add(dep.workflowId);
			addToSet(parentMap, dep.dependencyKey, dep.workflowId);
			switch (dep.dependencyType) {
				case 'credentialId':
					addToSet(credMap, dep.workflowId, dep.dependencyKey);
					allCredIds.add(dep.dependencyKey);
					break;
				case 'dataTableId':
					addToSet(dtMap, dep.workflowId, dep.dependencyKey);
					allDtIds.add(dep.dependencyKey);
					break;
				case 'workflowCall':
					addToSet(subMap, dep.workflowId, dep.dependencyKey);
					allWfIds.add(dep.dependencyKey);
					break;
			}
		}

		return { credMap, dtMap, subMap, parentMap, allCredIds, allWfIds, allDtIds };
	}

	/** Build enriched result — only includes accessible deps, counts inaccessible ones. */
	private buildEnrichedResult(
		resourceIds: string[],
		maps: RawDepMaps,
		accessMaps: {
			wfNames: Map<string, string>;
			credNames: Map<string, string>;
			dtNames: Map<string, { name: string; projectId: string }>;
		},
	): DependenciesBatchResponse {
		const result: DependenciesBatchResponse = {};

		for (const resourceId of resourceIds) {
			const dependencies: ResolvedDependency[] = [];
			let inaccessibleCount = 0;

			const resolve = (
				ids: Set<string> | undefined,
				nameMap: Map<string, string>,
				type: ResolvedDependency['type'],
			) => {
				for (const id of ids ?? []) {
					const name = nameMap.get(id);
					if (name !== undefined) {
						dependencies.push({ id, name, type });
					} else {
						inaccessibleCount++;
					}
				}
			};

			resolve(maps.subMap.get(resourceId), accessMaps.wfNames, 'workflowCall');
			resolve(maps.parentMap.get(resourceId), accessMaps.wfNames, 'workflowParent');
			resolve(maps.credMap.get(resourceId), accessMaps.credNames, 'credentialId');

			for (const id of maps.dtMap.get(resourceId) ?? []) {
				const dt = accessMaps.dtNames.get(id);
				if (dt) {
					dependencies.push({ id, name: dt.name, type: 'dataTableId', projectId: dt.projectId });
				} else {
					inaccessibleCount++;
				}
			}

			result[resourceId] = { dependencies, inaccessibleCount };
		}

		return result;
	}

	/**
	 * Filter a list of resource IDs to only those the user has access to.
	 */
	private async filterByAccess(
		ids: string[],
		resourceType: DependencyResourceType,
		user: User,
	): Promise<string[]> {
		if (ids.length === 0) return [];

		switch (resourceType) {
			case 'workflow': {
				const accessible = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
					ids,
					user,
					['workflow:read'],
				);
				return ids.filter((id) => accessible.has(id));
			}
			case 'credential': {
				const accessible = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
					ids,
					user,
					['credential:read'],
				);
				return ids.filter((id) => accessible.has(id));
			}
			case 'dataTable': {
				return await this.filterDataTableIdsByAccess(ids, user);
			}
		}
	}

	private async filterDataTableIdsByAccess(ids: string[], user: User): Promise<string[]> {
		if (hasGlobalScope(user, 'dataTable:listProject')) return ids;

		const dataTables = await this.dataTableRepository.find({
			where: { id: In(ids) },
			select: ['id', 'projectId'],
		});

		const roles = await this.roleService.rolesWithScope('project', ['dataTable:listProject']);
		const accessibleProjectIds = new Set(
			await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles),
		);

		return dataTables.filter((dt) => accessibleProjectIds.has(dt.projectId)).map((dt) => dt.id);
	}
}

function addToSet(map: Map<string, Set<string>>, key: string, val: string) {
	let set = map.get(key);
	if (!set) {
		set = new Set();
		map.set(key, set);
	}
	set.add(val);
}
