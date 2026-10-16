import type {
	AutomationMapCredentialNode,
	AutomationMapDataTableNode,
	AutomationMapEdge,
	AutomationMapEdgeKind,
	AutomationMapGraph,
	AutomationMapIconSource,
	AutomationMapScope,
	AutomationMapServiceNode,
	AutomationMapWorkflowNode,
	AutomationMapWorkflowRole,
} from '@n8n/api-types';
import { automationMapNodeRef } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { RoleService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { FolderRepository, ProjectRelationRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { Themed } from 'n8n-workflow';

import { CredentialsFinderService } from '@n8n/backend-services';
import { CredentialTypes } from '@/credential-types';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AutomationMapFingerprint } from './automation-map.entity';
import { AutomationMapRepository } from './automation-map.repository';
import type {
	CredentialTypeFacts,
	DynamicTarget,
	NodeTypeFacts,
	TypeDescriber,
	WorkflowFacts,
} from './automation-map-extraction';
import {
	collectWorkflowIdCandidates,
	extractWorkflowFacts,
	findDynamicTargetsInRows,
	findWebhookPathInUrl,
} from './automation-map-extraction';

const MAX_WORKFLOWS = 300;
const MAX_EXPANSION_ROUNDS = 6;
const ROWS_PER_PAGE = 250;
const MAX_ROW_PAGES = 4;

const GENERIC_CREDENTIAL_TYPES = new Set([
	'oAuth1Api',
	'oAuth2Api',
	'httpBasicAuth',
	'httpBearerAuth',
	'httpCustomAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpSslAuth',
	'jwtAuth',
	'crypto',
]);

interface LoadedWorkflow {
	entity: WorkflowEntity;
	role: AutomationMapWorkflowRole;
	facts: WorkflowFacts;
}

interface LoadedDataTable {
	id: string;
	name: string;
	projectId: string;
	columnNames: string[];
	rows: Array<Record<string, unknown>>;
	accessible: boolean;
	referencedIds?: string[];
}

interface ResolvedDynamicCall {
	sourceId: string;
	nodeName: string;
	targets: DynamicTarget[];
	tableName: string;
}

export interface AutomationMapBuildResult {
	graph: AutomationMapGraph;
	fingerprint: AutomationMapFingerprint;
	memberIds: string[];
}

function themedValues(value: Themed<string> | undefined): { light?: string; dark?: string } {
	if (!value) return {};
	if (typeof value === 'string') return { light: value };
	return { light: value.light, dark: value.dark };
}

function toIconSource(
	iconUrl: Themed<string> | undefined,
	icon: unknown,
	iconColor: string | undefined,
): AutomationMapIconSource | null {
	const { light: lightUrl, dark: darkUrl } = themedValues(iconUrl);
	if (lightUrl) {
		return { type: 'file', src: lightUrl, ...(darkUrl ? { srcDark: darkUrl } : {}) };
	}
	const rawIcon = typeof icon === 'string' ? icon : undefined;
	if (rawIcon && (rawIcon.startsWith('fa:') || rawIcon.startsWith('icon:'))) {
		return {
			type: 'icon',
			name: rawIcon.split(':')[1],
			...(iconColor ? { color: `var(--node--icon--color--${iconColor})` } : {}),
		};
	}
	return null;
}

function edgeId(kind: AutomationMapEdgeKind, source: string, target: string) {
	return `${kind}|${source}|${target}`;
}

@Service()
export class AutomationMapDiscoveryService {
	private nodeFactsCache = new Map<string, NodeTypeFacts | undefined>();

	private credentialFactsCache = new Map<string, CredentialTypeFacts | undefined>();

	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly folderRepository: FolderRepository,
		private readonly automationMapRepository: AutomationMapRepository,
		private readonly dataTableService: DataTableService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly workflowDependencyQueryService: WorkflowDependencyQueryService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialTypes: CredentialTypes,
	) {}

	readonly describer: TypeDescriber = {
		describeNode: (type, version) => this.describeNode(type, version),
		describeCredential: (type) => this.describeCredential(type),
	};

	async resolveMemberIds(scope: AutomationMapScope, user: User): Promise<string[]> {
		const candidates = new Set<string>();

		if (scope.folderIds?.length) {
			const descendants = await this.folderRepository.getAllFolderIdsInSubtrees(scope.folderIds);
			const byFolder = await this.workflowFinderService.findWorkflowIdsByFolder([
				...scope.folderIds,
				...descendants,
			]);
			for (const ids of byFolder.values()) ids.forEach((id) => candidates.add(id));
		}

		scope.workflowIds?.forEach((id) => candidates.add(id));

		if (scope.tags?.length) {
			const ids = await this.automationMapRepository.findWorkflowIdsByTagNames(
				scope.tags,
				scope.projectId,
			);
			ids.forEach((id) => candidates.add(id));
		}

		if (scope.nameQuery) {
			const ids = await this.automationMapRepository.findWorkflowIdsByName(
				scope.nameQuery,
				scope.projectId,
			);
			ids.forEach((id) => candidates.add(id));
		}

		const accessible = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			[...candidates],
			user,
			['workflow:read'],
		);
		return [...candidates].filter((id) => accessible.has(id));
	}

	async readVersions(workflowIds: string[], user: User): Promise<AutomationMapFingerprint> {
		const workflows = await this.workflowFinderService.findWorkflowsByIdsForUser(
			workflowIds,
			user,
			['workflow:read'],
		);
		const versions: AutomationMapFingerprint = {};
		for (const workflow of workflows) {
			if (workflow.isArchived) continue;
			versions[workflow.id] = this.versionOf(workflow);
		}
		return versions;
	}

	async build(scope: AutomationMapScope, user: User): Promise<AutomationMapBuildResult> {
		const memberIds = await this.resolveMemberIds(scope, user);
		const loaded = new Map<string, LoadedWorkflow>();
		const restrictedIds = new Set<string>();

		await this.loadWorkflows(memberIds, 'member', user, loaded, restrictedIds);

		const includeCalled = scope.includeCalledWorkflows !== false;
		const tables = new Map<string, LoadedDataTable>();
		let dynamicCalls: ResolvedDynamicCall[] = [];

		for (let round = 0; round < MAX_EXPANSION_ROUNDS; round++) {
			const pending = new Set<string>();
			if (includeCalled) {
				for (const workflow of loaded.values()) {
					if (workflow.role === 'caller') continue;
					for (const call of workflow.facts.staticCalls) {
						if (!loaded.has(call.targetId) && !restrictedIds.has(call.targetId)) {
							pending.add(call.targetId);
						}
					}
				}
			}

			await this.loadDataTables(loaded, tables, user);
			dynamicCalls = await this.resolveDynamicCalls(loaded, tables);
			if (includeCalled) {
				for (const call of dynamicCalls) {
					for (const target of call.targets) {
						if (!loaded.has(target.workflowId) && !restrictedIds.has(target.workflowId)) {
							pending.add(target.workflowId);
						}
					}
				}
			}

			if (pending.size === 0 || loaded.size >= MAX_WORKFLOWS) break;
			const room = MAX_WORKFLOWS - loaded.size;
			await this.loadWorkflows([...pending].slice(0, room), 'dependency', user, loaded, restrictedIds);
		}

		if (scope.includeCallers !== false) {
			const callerIds = await this.findCallers(memberIds, user, loaded);
			await this.loadWorkflows(callerIds, 'caller', user, loaded, restrictedIds);
		}

		const graph = await this.assembleGraph(loaded, tables, dynamicCalls, restrictedIds, user);
		const fingerprint: AutomationMapFingerprint = {};
		for (const { entity } of loaded.values()) fingerprint[entity.id] = this.versionOf(entity);

		return { graph, fingerprint, memberIds };
	}

	private versionOf(workflow: WorkflowEntity): string {
		return workflow.versionId ?? workflow.updatedAt?.toISOString() ?? '';
	}

	private async loadWorkflows(
		ids: string[],
		role: AutomationMapWorkflowRole,
		user: User,
		loaded: Map<string, LoadedWorkflow>,
		restrictedIds: Set<string>,
	) {
		const wanted = ids.filter((id) => !loaded.has(id));
		if (wanted.length === 0) return;
		const workflows = await this.workflowFinderService.findWorkflowsByIdsForUser(
			wanted,
			user,
			['workflow:read'],
			{ includeParentFolder: true, includeTags: true },
		);
		const found = new Set<string>();
		for (const entity of workflows) {
			if (entity.isArchived) continue;
			found.add(entity.id);
			loaded.set(entity.id, {
				entity,
				role,
				facts: extractWorkflowFacts(entity, this.describer),
			});
		}
		const missing = wanted.filter((id) => !found.has(id));
		if (missing.length === 0) return;
		const existing = await this.workflowFinderService.findExistingWorkflowIds(missing);
		for (const id of missing) {
			if (existing.has(id)) restrictedIds.add(id);
		}
	}

	private async loadDataTables(
		loaded: Map<string, LoadedWorkflow>,
		tables: Map<string, LoadedDataTable>,
		user: User,
	) {
		const ids = new Set<string>();
		for (const { facts, role } of loaded.values()) {
			if (role === 'caller') continue;
			facts.dataTables.forEach((use) => ids.add(use.id));
		}
		const missing = [...ids].filter((id) => !tables.has(id));
		if (missing.length === 0) return;

		const entities = await this.dataTableService.findDataTablesByIds(missing);
		const accessibleProjects = await this.accessibleDataTableProjects(user);

		for (const entity of entities) {
			const accessible = accessibleProjects === 'all' || accessibleProjects.has(entity.projectId);
			tables.set(entity.id, {
				id: entity.id,
				name: entity.name,
				projectId: entity.projectId,
				columnNames: (entity.columns ?? [])
					.slice()
					.sort((a, b) => a.index - b.index)
					.map((column) => column.name),
				rows: accessible ? await this.readRows(entity.id, entity.projectId) : [],
				accessible,
			});
		}
	}

	private async accessibleDataTableProjects(user: User): Promise<Set<string> | 'all'> {
		if (hasGlobalScope(user, 'dataTable:listProject')) return 'all';
		const roles = await this.roleService.rolesWithScope('project', ['dataTable:read']);
		return new Set(await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles));
	}

	private async readRows(dataTableId: string, projectId: string) {
		const rows: Array<Record<string, unknown>> = [];
		try {
			for (let page = 0; page < MAX_ROW_PAGES; page++) {
				const result = await this.dataTableService.getManyRowsAndCount(dataTableId, projectId, {
					take: ROWS_PER_PAGE,
					skip: page * ROWS_PER_PAGE,
				});
				rows.push(...result.data);
				if (result.data.length < ROWS_PER_PAGE) break;
			}
		} catch (error) {
			this.logger.debug('Automation map could not read data table rows', { dataTableId, error });
		}
		return rows;
	}

	private async resolveDynamicCalls(
		loaded: Map<string, LoadedWorkflow>,
		tables: Map<string, LoadedDataTable>,
	): Promise<ResolvedDynamicCall[]> {
		const candidates = new Set<string>();
		for (const table of tables.values()) collectWorkflowIdCandidates(table.rows, candidates);
		const existing = await this.workflowFinderService.findExistingWorkflowIds([...candidates]);

		const resolved: ResolvedDynamicCall[] = [];
		for (const [workflowId, workflow] of loaded) {
			for (const call of workflow.facts.dynamicCalls) {
				call.resolvedVia = undefined;
				const ownTables = workflow.facts.dataTables
					.filter((use) => use.access === 'reads')
					.map((use) => tables.get(use.id))
					.filter((table): table is LoadedDataTable => table !== undefined);

				let match = this.matchTables(ownTables, call.propertyNames, existing, true);
				if (!match) {
					match = this.matchTables([...tables.values()], call.propertyNames, existing, false);
				}
				if (!match) continue;
				call.resolvedVia = `${match.table.name}.${match.targets[0].columnPath}`;
				resolved.push({
					sourceId: workflowId,
					nodeName: call.nodeName,
					targets: match.targets.filter((target) => target.workflowId !== workflowId),
					tableName: match.table.name,
				});
			}
		}

		for (const table of tables.values()) {
			const found = new Set<string>();
			collectWorkflowIdCandidates(table.rows, found);
			table.referencedIds = [...found].filter((id) => existing.has(id));
		}
		return resolved;
	}

	private matchTables(
		tables: LoadedDataTable[],
		propertyNames: string[],
		existing: Set<string>,
		allowWorkflowNamedColumns: boolean,
	): { table: LoadedDataTable; targets: DynamicTarget[] } | undefined {
		for (const table of tables) {
			const targets = findDynamicTargetsInRows(table.rows, propertyNames, existing, {
				allowWorkflowNamedColumns,
			});
			if (targets.length > 0) return { table, targets };
		}
		return undefined;
	}

	private async findCallers(
		memberIds: string[],
		user: User,
		loaded: Map<string, LoadedWorkflow>,
	): Promise<string[]> {
		if (memberIds.length === 0) return [];
		const dependencies = await this.workflowDependencyQueryService.getResourceDependencies(
			memberIds,
			'workflow',
			user,
		);
		const callerIds = new Set<string>();
		for (const result of Object.values(dependencies)) {
			for (const dependency of result.dependencies) {
				if (dependency.type !== 'workflowParent' && dependency.type !== 'errorWorkflowParent') {
					continue;
				}
				if (!loaded.has(dependency.id) && !dependency.unavailable) callerIds.add(dependency.id);
			}
		}
		return [...callerIds].slice(0, Math.max(0, MAX_WORKFLOWS - loaded.size));
	}

	private async assembleGraph(
		loaded: Map<string, LoadedWorkflow>,
		tables: Map<string, LoadedDataTable>,
		dynamicCalls: ResolvedDynamicCall[],
		restrictedIds: Set<string>,
		user: User,
	): Promise<AutomationMapGraph> {
		const edges = new Map<string, AutomationMapEdge>();
		const addEdge = (
			kind: AutomationMapEdgeKind,
			source: string,
			target: string,
			nodeName: string,
			label?: string,
		) => {
			const id = edgeId(kind, source, target);
			const existing = edges.get(id);
			if (existing) {
				if (!existing.nodeNames.includes(nodeName)) existing.nodeNames.push(nodeName);
				return;
			}
			edges.set(id, { id, kind, source, target, nodeNames: [nodeName], ...(label ? { label } : {}) });
		};

		const inMap = (workflowId: string) => loaded.has(workflowId) || restrictedIds.has(workflowId);
		const folderIds = new Set<string>();
		for (const { entity } of loaded.values()) {
			if (entity.parentFolder?.id) folderIds.add(entity.parentFolder.id);
		}
		const folderPaths = await this.folderRepository.getFolderPathsToRoot([...folderIds]);

		const services = new Map<string, AutomationMapServiceNode>();
		const credentialUses = new Map<string, { name: string; type: string }>();
		const webhookOwners = new Map<string, string>();

		for (const [workflowId, { facts, role }] of loaded) {
			if (role === 'caller') continue;
			for (const webhook of facts.webhooks) webhookOwners.set(webhook.path, workflowId);
		}

		const workflowNodes: AutomationMapWorkflowNode[] = [];
		for (const [workflowId, { entity, role, facts }] of loaded) {
			const source = automationMapNodeRef.workflow(workflowId);
			const serviceIds = new Set<string>();

			for (const call of facts.staticCalls) {
				if (!inMap(call.targetId)) continue;
				addEdge(call.kind, source, automationMapNodeRef.workflow(call.targetId), call.nodeName);
			}

			for (const url of facts.outgoingUrls) {
				const path = findWebhookPathInUrl(url.url, webhookOwners.keys());
				const owner = path ? webhookOwners.get(path) : undefined;
				if (owner && owner !== workflowId) {
					addEdge('webhookCall', source, automationMapNodeRef.workflow(owner), url.nodeName);
				}
			}

			if (role !== 'caller') {
				for (const use of facts.dataTables) {
					addEdge(use.access, source, automationMapNodeRef.dataTable(use.id), use.nodeName);
				}
				for (const use of facts.credentials) {
					credentialUses.set(use.id, { name: use.name, type: use.type });
					addEdge('usesCredential', source, automationMapNodeRef.credential(use.id), use.nodeName);
				}
				for (const use of facts.services) {
					serviceIds.add(use.serviceId);
					const known = services.get(use.serviceId);
					if (!known) {
						services.set(use.serviceId, {
							id: use.serviceId,
							name: use.name,
							icon: use.icon,
							hosts: use.host ? [use.host] : [],
						});
					} else {
						if (!known.icon && use.icon) known.icon = use.icon;
						if (use.host && !known.hosts.includes(use.host)) known.hosts.push(use.host);
					}
					addEdge('usesService', source, automationMapNodeRef.service(use.serviceId), use.nodeName);
				}
			}

			const folderId = entity.parentFolder?.id ?? null;
			workflowNodes.push({
				id: workflowId,
				name: entity.name,
				description: entity.description ?? null,
				active: entity.activeVersionId !== null && entity.activeVersionId !== undefined,
				isArchived: entity.isArchived,
				accessible: true,
				role,
				projectId: null,
				folderId,
				folderPath: folderId ? (folderPaths.get(folderId) ?? []) : [],
				tags: (entity.tags ?? []).map((tag) => tag.name),
				nodeCount: (entity.nodes ?? []).filter((node) => node.type !== 'n8n-nodes-base.stickyNote')
					.length,
				triggers: facts.triggers,
				serviceIds: [...serviceIds],
				dynamicCalls: facts.dynamicCalls.map(({ nodeName, expression, resolvedVia }) => ({
					nodeName,
					expression,
					...(resolvedVia ? { resolvedVia } : {}),
				})),
				updatedAt: entity.updatedAt?.toISOString() ?? null,
				versionId: entity.versionId ?? null,
			});
		}

		for (const restrictedId of restrictedIds) {
			workflowNodes.push({
				id: restrictedId,
				name: 'Workflow you cannot open',
				description: null,
				active: false,
				isArchived: false,
				accessible: false,
				role: 'dependency',
				projectId: null,
				folderId: null,
				folderPath: [],
				tags: [],
				nodeCount: 0,
				triggers: [],
				serviceIds: [],
				dynamicCalls: [],
				updatedAt: null,
				versionId: null,
			});
		}

		for (const call of dynamicCalls) {
			for (const target of call.targets) {
				if (!inMap(target.workflowId)) continue;
				addEdge(
					'callsDynamic',
					automationMapNodeRef.workflow(call.sourceId),
					automationMapNodeRef.workflow(target.workflowId),
					call.nodeName,
					`via ${call.tableName}.${target.columnPath}`,
				);
			}
		}

		const dataTableNodes: AutomationMapDataTableNode[] = [];
		const usedTableIds = new Set<string>();
		for (const edge of edges.values()) {
			if (edge.kind === 'reads' || edge.kind === 'writes') {
				usedTableIds.add(edge.target.slice('dataTable:'.length));
			}
		}
		for (const tableId of usedTableIds) {
			const table = tables.get(tableId);
			dataTableNodes.push({
				id: tableId,
				name: table?.name ?? 'Unknown data table',
				projectId: table?.projectId ?? null,
				accessible: table?.accessible ?? false,
				columnNames: table?.columnNames ?? [],
				referencedWorkflowIds: (table?.referencedIds ?? []).filter((id) => loaded.has(id)),
			});
		}

		const credentialNodes = await this.describeCredentials(credentialUses, user);

		return {
			workflows: workflowNodes,
			dataTables: dataTableNodes,
			credentials: credentialNodes,
			services: [...services.values()],
			edges: [...edges.values()],
		};
	}

	private async describeCredentials(
		uses: Map<string, { name: string; type: string }>,
		user: User,
	): Promise<AutomationMapCredentialNode[]> {
		const ids = [...uses.keys()];
		const accessible = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
			ids,
			user,
			['credential:read'],
			{ visibilityOnly: true },
		);
		const stored = await this.automationMapRepository.findCredentialsByIds(ids);
		const storedById = new Map(stored.map((credential) => [credential.id, credential]));

		return [...uses.entries()].map(([id, use]) => {
			const credential = storedById.get(id);
			const type = credential?.type ?? use.type;
			const facts = this.describeCredential(type);
			return {
				id,
				name: credential?.name ?? use.name,
				type,
				typeDisplayName: facts?.displayName ?? type,
				accessible: accessible.has(id),
				icon: facts?.icon ?? null,
			};
		});
	}

	private describeNode(type: string, version: number): NodeTypeFacts | undefined {
		const key = `${type}@${version}`;
		if (this.nodeFactsCache.has(key)) return this.nodeFactsCache.get(key);
		let facts: NodeTypeFacts | undefined;
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(type, version);
			const categories = description.codex?.categories ?? [];
			facts = {
				displayName: description.displayName,
				isTrigger: description.group.includes('trigger'),
				isCore: categories.includes('Core Nodes') || type.startsWith('@n8n/n8n-nodes-langchain.'),
				icon: toIconSource(description.iconUrl, description.icon, description.iconColor),
			};
		} catch {
			facts = undefined;
		}
		this.nodeFactsCache.set(key, facts);
		return facts;
	}

	private describeCredential(type: string): CredentialTypeFacts | undefined {
		if (this.credentialFactsCache.has(type)) return this.credentialFactsCache.get(type);
		let facts: CredentialTypeFacts | undefined;
		try {
			const credentialType = this.credentialTypes.getByName(type);
			facts = {
				displayName: credentialType.displayName,
				isGeneric: GENERIC_CREDENTIAL_TYPES.has(type),
				icon: toIconSource(credentialType.iconUrl, credentialType.icon, credentialType.iconColor),
			};
		} catch {
			facts = undefined;
		}
		this.credentialFactsCache.set(type, facts);
		return facts;
	}
}
