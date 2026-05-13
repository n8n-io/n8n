import type {
	DependenciesBatchResponse,
	DependencyCountsBatchResponse,
	DependencyResourceType,
	ResolvedDependency,
} from '@n8n/api-types';
import {
	CredentialsRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
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
	errorWfMap: Map<string, Set<string>>;
	errorWfParentMap: Map<string, Set<string>>;
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
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
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
				errorWorkflow: maps.errorWfMap.get(id)?.size ?? 0,
				errorWorkflowParent: maps.errorWfParentMap.get(id)?.size ?? 0,
				workflowCall: maps.subMap.get(id)?.size ?? 0,
				workflowParent: maps.parentMap.get(id)?.size ?? 0,
			};
		}
		return result;
	}

	/**
	 * Build a DOT-format dependency graph for every workflow the user can read.
	 * Workflows, credentials and data tables the user cannot access appear as
	 * anonymized "(restricted)" nodes so the graph structure is preserved
	 * without leaking resource identifiers.
	 */
	async getDependencyGraph(user: User, opts: { layout?: 'lr' | 'tb' } = {}): Promise<string> {
		const layout = opts.layout ?? 'lr';
		const accessibleWfIds = await this.workflowFinderService.findAllWorkflowIdsForUser(user, [
			'workflow:read',
		]);

		if (accessibleWfIds.length === 0) return emptyDotGraph(layout);

		const rawDeps = await this.dependencyRepository.find({
			where: [
				{
					workflowId: In(accessibleWfIds),
					dependencyType: In(['credentialId', 'dataTableId', 'errorWorkflow', 'workflowCall']),
				},
				{
					dependencyKey: In(accessibleWfIds),
					dependencyType: In(['errorWorkflow', 'workflowCall']),
				},
			],
			select: ['workflowId', 'dependencyType', 'dependencyKey'],
		});

		if (rawDeps.length === 0) return emptyDotGraph(layout);

		const maps = this.buildDepMaps(rawDeps);

		const [accessibleReferencedWfIds, accessibleCredIds, accessibleDtIds] = await Promise.all([
			this.filterByAccess([...maps.allWfIds], 'workflow', user),
			this.filterByAccess([...maps.allCredIds], 'credential', user),
			this.filterByAccess([...maps.allDtIds], 'dataTable', user),
		]);

		const [credentials, workflows, dataTables, wfOwners, credOwners] = await Promise.all([
			accessibleCredIds.length > 0
				? this.credentialsRepository.find({
						where: { id: In(accessibleCredIds) },
						select: ['id', 'name'],
					})
				: [],
			accessibleReferencedWfIds.length > 0
				? this.workflowRepository.find({
						where: { id: In(accessibleReferencedWfIds) },
						select: ['id', 'name'],
					})
				: [],
			accessibleDtIds.length > 0
				? this.dataTableRepository.find({
						where: { id: In(accessibleDtIds) },
						select: ['id', 'name', 'projectId'],
					})
				: [],
			accessibleReferencedWfIds.length > 0
				? this.sharedWorkflowRepository.find({
						where: { workflowId: In(accessibleReferencedWfIds), role: 'workflow:owner' },
						select: ['workflowId', 'projectId'],
					})
				: [],
			accessibleCredIds.length > 0
				? this.sharedCredentialsRepository.find({
						where: { credentialsId: In(accessibleCredIds), role: 'credential:owner' },
						select: ['credentialsId', 'projectId'],
					})
				: [],
		]);

		const wfProjects = new Map<string, string>();
		const credProjects = new Map<string, string>();
		const dtProjects = new Map<string, string>();
		for (const sw of wfOwners) wfProjects.set(sw.workflowId, sw.projectId);
		for (const sc of credOwners) credProjects.set(sc.credentialsId, sc.projectId);
		for (const dt of dataTables) dtProjects.set(dt.id, dt.projectId);

		const projectIds = new Set<string>([
			...wfProjects.values(),
			...credProjects.values(),
			...dtProjects.values(),
		]);
		const projects =
			projectIds.size > 0
				? await this.projectRepository.find({
						where: { id: In([...projectIds]) },
						select: ['id', 'name'],
					})
				: [];
		const projectNames = new Map<string, string>();
		for (const p of projects) projectNames.set(p.id, p.name ?? p.id);

		const wfNames = new Map<string, string>();
		const credNames = new Map<string, string>();
		const dtNames = new Map<string, string>();
		for (const w of workflows) wfNames.set(w.id, w.name ?? w.id);
		for (const c of credentials) credNames.set(c.id, c.name ?? c.id);
		for (const dt of dataTables) dtNames.set(dt.id, dt.name ?? dt.id);

		return buildDotGraph(
			maps,
			{
				wfNames,
				credNames,
				dtNames,
				wfProjects,
				credProjects,
				dtProjects,
				projectNames,
			},
			layout,
		);
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
					dependencyType: In(['credentialId', 'dataTableId', 'errorWorkflow', 'workflowCall']),
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
		const errorWfMap = new Map<string, Set<string>>();
		const errorWfParentMap = new Map<string, Set<string>>();
		const allCredIds = new Set<string>();
		const allWfIds = new Set<string>();
		const allDtIds = new Set<string>();

		for (const dep of rawDeps) {
			allWfIds.add(dep.workflowId);
			switch (dep.dependencyType) {
				case 'credentialId':
					addToSet(credMap, dep.workflowId, dep.dependencyKey);
					addToSet(parentMap, dep.dependencyKey, dep.workflowId);
					allCredIds.add(dep.dependencyKey);
					break;
				case 'dataTableId':
					addToSet(dtMap, dep.workflowId, dep.dependencyKey);
					addToSet(parentMap, dep.dependencyKey, dep.workflowId);
					allDtIds.add(dep.dependencyKey);
					break;
				case 'workflowCall':
					addToSet(subMap, dep.workflowId, dep.dependencyKey);
					addToSet(parentMap, dep.dependencyKey, dep.workflowId);
					allWfIds.add(dep.dependencyKey);
					break;
				case 'errorWorkflow':
					addToSet(errorWfMap, dep.workflowId, dep.dependencyKey);
					addToSet(errorWfParentMap, dep.dependencyKey, dep.workflowId);
					allWfIds.add(dep.dependencyKey);
					break;
			}
		}

		return {
			credMap,
			dtMap,
			subMap,
			parentMap,
			errorWfMap,
			errorWfParentMap,
			allCredIds,
			allWfIds,
			allDtIds,
		};
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
			resolve(maps.errorWfMap.get(resourceId), accessMaps.wfNames, 'errorWorkflow');
			resolve(maps.errorWfParentMap.get(resourceId), accessMaps.wfNames, 'errorWorkflowParent');
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

function rankdirFor(layout: 'lr' | 'tb'): string {
	return layout === 'tb' ? 'TB' : 'LR';
}

function emptyDotGraph(layout: 'lr' | 'tb' = 'lr'): string {
	return `digraph WorkflowDependencies {\n  rankdir=${rankdirFor(layout)};\n}\n`;
}

function dotEscape(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

type ResourcePrefix = 'wf' | 'cred' | 'dt';

const RESOURCE_STYLE: Record<ResourcePrefix, { shape: string; fillcolor: string; color: string }> =
	{
		// Workflows: blue
		wf: { shape: 'box', fillcolor: '#DBEAFE', color: '#1D4ED8' },
		// Credentials: green
		cred: { shape: 'ellipse', fillcolor: '#DCFCE7', color: '#15803D' },
		// Data tables: orange
		dt: { shape: 'cylinder', fillcolor: '#FED7AA', color: '#C2410C' },
	};

function sanitizeProjectClusterId(projectId: string): string {
	return projectId.replace(/[^A-Za-z0-9_]/g, '_');
}

function buildDotGraph(
	maps: RawDepMaps,
	info: {
		wfNames: Map<string, string>;
		credNames: Map<string, string>;
		dtNames: Map<string, string>;
		wfProjects: Map<string, string>;
		credProjects: Map<string, string>;
		dtProjects: Map<string, string>;
		projectNames: Map<string, string>;
	},
	layout: 'lr' | 'tb' = 'lr',
): string {
	const lines: string[] = [];
	lines.push('digraph WorkflowDependencies {');
	lines.push(`  rankdir=${rankdirFor(layout)};`);
	lines.push('  compound=true;');
	// newrank=true makes dot honor cluster constraints across the rank assignment,
	// so nodes stay inside their declared cluster even when they have many
	// edges crossing to other clusters.
	lines.push('  newrank=true;');
	lines.push('  node [fontname="Helvetica", style="filled,rounded"];');
	lines.push('  edge [fontname="Helvetica", fontsize=10];');
	lines.push('');

	const restrictedIds = new Map<string, string>();
	let restrictedCounter = 0;
	const nodeIdFor = (
		id: string,
		prefix: ResourcePrefix,
		nameMap: Map<string, string>,
	): { nodeId: string; accessible: boolean } => {
		if (nameMap.has(id)) return { nodeId: `${prefix}_${id}`, accessible: true };
		let placeholder = restrictedIds.get(`${prefix}:${id}`);
		if (!placeholder) {
			placeholder = `restricted_${prefix}_${++restrictedCounter}`;
			restrictedIds.set(`${prefix}:${id}`, placeholder);
		}
		return { nodeId: placeholder, accessible: false };
	};

	const accessibleNodeLine = (nodeId: string, label: string, prefix: ResourcePrefix): string => {
		const { shape, fillcolor, color } = RESOURCE_STYLE[prefix];
		return `    "${nodeId}" [label="${dotEscape(label)}", shape=${shape}, fillcolor="${fillcolor}", color="${color}"];`;
	};
	const restrictedNodeLine = (nodeId: string, prefix: ResourcePrefix): string => {
		const { shape } = RESOURCE_STYLE[prefix];
		return `    "${nodeId}" [label="(restricted)", shape=${shape}, style="filled,dashed,rounded", fillcolor="#F3F4F6", color="#6B7280"];`;
	};

	// Bucket accessible nodes by their owning project; track unprojected/orphans.
	const byProject = new Map<string, { wfs: Set<string>; creds: Set<string>; dts: Set<string> }>();
	const orphans = { wfs: new Set<string>(), creds: new Set<string>(), dts: new Set<string>() };
	const bucket = (set: 'wfs' | 'creds' | 'dts', id: string, projectId: string | undefined) => {
		if (!projectId) {
			orphans[set].add(id);
			return;
		}
		let entry = byProject.get(projectId);
		if (!entry) {
			entry = { wfs: new Set(), creds: new Set(), dts: new Set() };
			byProject.set(projectId, entry);
		}
		entry[set].add(id);
	};

	const restrictedWfs = new Set<string>();
	const restrictedCreds = new Set<string>();
	const restrictedDts = new Set<string>();

	for (const id of maps.allWfIds) {
		if (info.wfNames.has(id)) bucket('wfs', id, info.wfProjects.get(id));
		else restrictedWfs.add(id);
	}
	for (const id of maps.allCredIds) {
		if (info.credNames.has(id)) bucket('creds', id, info.credProjects.get(id));
		else restrictedCreds.add(id);
	}
	for (const id of maps.allDtIds) {
		if (info.dtNames.has(id)) bucket('dts', id, info.dtProjects.get(id));
		else restrictedDts.add(id);
	}

	// Emit one cluster per project (sorted by project name for stable output).
	const sortedProjectIds = [...byProject.keys()].sort((a, b) => {
		const na = info.projectNames.get(a) ?? a;
		const nb = info.projectNames.get(b) ?? b;
		return na.localeCompare(nb);
	});

	for (const projectId of sortedProjectIds) {
		const entry = byProject.get(projectId)!;
		const projectLabel = dotEscape(info.projectNames.get(projectId) ?? projectId);
		lines.push(`  subgraph cluster_project_${sanitizeProjectClusterId(projectId)} {`);
		lines.push(`    label="${projectLabel}";`);
		lines.push('    style="rounded,filled";');
		lines.push('    fillcolor="#F9FAFB";');
		lines.push('    color="#D1D5DB";');
		for (const id of entry.wfs) {
			lines.push(accessibleNodeLine(`wf_${id}`, info.wfNames.get(id)!, 'wf'));
		}
		for (const id of entry.creds) {
			lines.push(accessibleNodeLine(`cred_${id}`, info.credNames.get(id)!, 'cred'));
		}
		for (const id of entry.dts) {
			lines.push(accessibleNodeLine(`dt_${id}`, info.dtNames.get(id)!, 'dt'));
		}
		lines.push('  }');
	}

	// Resources we can read but whose owning project we couldn't resolve.
	if (orphans.wfs.size + orphans.creds.size + orphans.dts.size > 0) {
		lines.push('  subgraph cluster_project_unassigned {');
		lines.push('    label="(no project)";');
		lines.push('    style="rounded,filled";');
		lines.push('    fillcolor="#F9FAFB";');
		lines.push('    color="#D1D5DB";');
		for (const id of orphans.wfs) {
			lines.push(accessibleNodeLine(`wf_${id}`, info.wfNames.get(id)!, 'wf'));
		}
		for (const id of orphans.creds) {
			lines.push(accessibleNodeLine(`cred_${id}`, info.credNames.get(id)!, 'cred'));
		}
		for (const id of orphans.dts) {
			lines.push(accessibleNodeLine(`dt_${id}`, info.dtNames.get(id)!, 'dt'));
		}
		lines.push('  }');
	}

	// Inaccessible resources: group together so the user sees "this part of the graph is hidden".
	if (restrictedWfs.size + restrictedCreds.size + restrictedDts.size > 0) {
		lines.push('  subgraph cluster_restricted {');
		lines.push('    label="Restricted";');
		lines.push('    style="rounded,filled,dashed";');
		lines.push('    fillcolor="#F3F4F6";');
		lines.push('    color="#9CA3AF";');
		for (const id of restrictedWfs) {
			const { nodeId } = nodeIdFor(id, 'wf', info.wfNames);
			lines.push(restrictedNodeLine(nodeId, 'wf'));
		}
		for (const id of restrictedCreds) {
			const { nodeId } = nodeIdFor(id, 'cred', info.credNames);
			lines.push(restrictedNodeLine(nodeId, 'cred'));
		}
		for (const id of restrictedDts) {
			const { nodeId } = nodeIdFor(id, 'dt', info.dtNames);
			lines.push(restrictedNodeLine(nodeId, 'dt'));
		}
		lines.push('  }');
	}

	lines.push('');

	const emitEdges = (
		sourceMap: Map<string, Set<string>>,
		targetPrefix: ResourcePrefix,
		targetNames: Map<string, string>,
		attrs: string,
	) => {
		for (const [sourceId, targets] of sourceMap) {
			const source = nodeIdFor(sourceId, 'wf', info.wfNames).nodeId;
			for (const targetId of targets) {
				const target = nodeIdFor(targetId, targetPrefix, targetNames).nodeId;
				lines.push(`  "${source}" -> "${target}" [${attrs}];`);
			}
		}
	};

	emitEdges(maps.subMap, 'wf', info.wfNames, 'label="calls"');
	emitEdges(maps.errorWfMap, 'wf', info.wfNames, 'label="error", style=dashed');
	emitEdges(maps.credMap, 'cred', info.credNames, 'label="uses", color="#888888"');
	emitEdges(maps.dtMap, 'dt', info.dtNames, 'label="uses", color="#888888"');

	lines.push('}');
	return lines.join('\n') + '\n';
}
