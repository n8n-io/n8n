import type {
	DependenciesBatchResponse,
	GraphEdge,
	GraphNode,
	ProjectDependencyGraph,
	ProjectGraphMember,
	ProjectGraphStats,
	ProjectGraphVariable,
	RelationshipType,
	ResolvedDependency,
	WorkflowTriggerType,
} from '@n8n/api-types';
import {
	FolderRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { In, IsNull } from '@n8n/typeorm';
import {
	CHAT_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	PROJECT_ROOT,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';

const DEPENDENCY_BATCH_SIZE = 100;

const DEP_TYPE_TO_RELATIONSHIP: Partial<Record<ResolvedDependency['type'], RelationshipType>> = {
	aiToolWorkflowCall: 'uses-as-tool',
	aiToolWorkflowParent: 'uses-as-tool',
	credentialId: 'uses-credential',
	dataTableId: 'references-data-table',
	errorWorkflow: 'handles-errors-for',
	errorWorkflowParent: 'handles-errors-for',
	workflowCall: 'calls-workflow',
	workflowParent: 'calls-workflow',
};

const REVERSE_DEP_TYPES = new Set<ResolvedDependency['type']>([
	'aiToolWorkflowParent',
	'errorWorkflowParent',
	'workflowParent',
]);

interface WorkflowGraphDetails {
	id: string;
	name: string;
	activeVersionId: string | null;
	isArchived: boolean;
	parentFolder: { id: string } | null;
	tags?: Array<{ id: string; name: string }>;
}

interface FolderGraphDetails {
	id: string;
	name: string;
	parentFolderId: string | null;
}

/** Trigger node type → graph trigger type, most distinctive first (used as precedence). */
const TRIGGER_NODE_TYPE_MAP: Array<[string, WorkflowTriggerType]> = [
	[CHAT_TRIGGER_NODE_TYPE, 'chat'],
	[WEBHOOK_NODE_TYPE, 'webhook'],
	['n8n-nodes-base.slackTrigger', 'slack'],
	[SCHEDULE_TRIGGER_NODE_TYPE, 'schedule'],
	['n8n-nodes-base.cron', 'schedule'],
	[FORM_TRIGGER_NODE_TYPE, 'form'],
	[ERROR_TRIGGER_NODE_TYPE, 'error'],
	[MCP_TRIGGER_NODE_TYPE, 'mcp'],
	[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, 'subworkflow'],
	[MANUAL_TRIGGER_NODE_TYPE, 'manual'],
];

@Service()
export class ProjectDependencyGraphService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly dataTableRepository: DataTableRepository,
		private readonly workflowDependencyQueryService: WorkflowDependencyQueryService,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
	) {}

	async getGraph(
		projectId: string,
		user: User,
		options: {
			folderId?: string;
			explode?: boolean;
			draft?: boolean;
			relationshipTypes?: string[];
		} = {},
	): Promise<ProjectDependencyGraph> {
		const folderId = options.folderId ?? PROJECT_ROOT;
		const explode = options.explode ?? false;
		const draft = options.draft;
		const relationshipFilter = options.relationshipTypes
			? new Set(options.relationshipTypes as RelationshipType[])
			: undefined;

		const project = await this.projectRepository.findOne({ where: { id: projectId } });
		if (!project) throw new NotFoundError('Project not found');

		const ownedSharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId, role: 'workflow:owner' },
			select: { workflowId: true },
		});
		const ownedWorkflowIds = ownedSharedWorkflows.map((s) => s.workflowId);

		const [allWorkflowDetails, ownedCredentials, dataTables, allFolders, members, variables] =
			await Promise.all([
				this.getWorkflowDetails(ownedWorkflowIds),
				this.sharedCredentialsRepository.find({
					where: { projectId, role: 'credential:owner' },
					relations: { credentials: true },
					select: { credentialsId: true, credentials: { id: true, name: true } },
				}),
				this.dataTableRepository.find({
					where: { projectId },
					select: { id: true, name: true },
				}),
				this.folderRepository.find({
					where: { homeProject: { id: projectId } },
					select: { id: true, name: true, parentFolderId: true } as never,
				}) as Promise<FolderGraphDetails[]>,
				this.projectRelationRepository.find({
					where: { projectId },
					relations: { user: true, role: true },
				}),
				this.getVariables(user, projectId),
			]);

		const childFoldersByParent = new Map<string | null, FolderGraphDetails[]>();
		for (const folder of allFolders) {
			const parent = folder.parentFolderId ?? null;
			const siblings = childFoldersByParent.get(parent) ?? [];
			siblings.push(folder);
			childFoldersByParent.set(parent, siblings);
		}

		let scopedFolderIds: string[];
		if (explode && folderId !== PROJECT_ROOT) {
			scopedFolderIds = [
				folderId,
				...this.collectDescendantFolderIds(folderId, childFoldersByParent),
			];
		} else {
			const parent = folderId === PROJECT_ROOT ? null : folderId;
			scopedFolderIds = (childFoldersByParent.get(parent) ?? []).map((f) => f.id);
		}
		const scopedFolderIdSet = new Set(scopedFolderIds);
		const folders = allFolders.filter((f) => scopedFolderIdSet.has(f.id));

		// Archived workflows are invisible on the graph, but their dependency rows still
		// exist — track their IDs so they don't resurface as referenced ghost nodes.
		const archivedWorkflowIds = new Set(
			allWorkflowDetails.filter((w) => w.isArchived).map((w) => w.id),
		);
		const workflowDetails = allWorkflowDetails.filter((w) => !w.isArchived);

		const activeWorkflowIds = workflowDetails.map((w) => w.id);
		const depResponse = await this.getDependencyEdges(activeWorkflowIds, user, draft);

		const inScopeWorkflowIds = this.filterWorkflowsByFolder(
			workflowDetails,
			folderId,
			explode,
			scopedFolderIds,
		);
		const inScopeWorkflowIdSet = new Set(inScopeWorkflowIds);

		const referencedNodeIds = new Set<string>();
		const edges: GraphEdge[] = [];

		for (const [sourceWorkflowId, result] of Object.entries(depResponse)) {
			if (!inScopeWorkflowIdSet.has(sourceWorkflowId)) continue;

			for (const dep of result.dependencies) {
				const relationshipType = DEP_TYPE_TO_RELATIONSHIP[dep.type];
				if (!relationshipType) continue;
				if (relationshipFilter && !relationshipFilter.has(relationshipType)) continue;
				if (archivedWorkflowIds.has(dep.id)) continue;

				referencedNodeIds.add(dep.id);

				const isReverse = REVERSE_DEP_TYPES.has(dep.type);
				edges.push(
					isReverse
						? { sourceId: dep.id, targetId: sourceWorkflowId, type: relationshipType }
						: { sourceId: sourceWorkflowId, targetId: dep.id, type: relationshipType },
				);
			}
		}

		if (!relationshipFilter || relationshipFilter.has('contained-in-folder')) {
			for (const wf of workflowDetails) {
				if (!inScopeWorkflowIdSet.has(wf.id)) continue;
				const parentFolderId = wf.parentFolder?.id ?? PROJECT_ROOT;
				edges.push({ sourceId: wf.id, targetId: parentFolderId, type: 'contained-in-folder' });
			}
			for (const folder of folders) {
				const parentFolderId = folder.parentFolderId ?? PROJECT_ROOT;
				edges.push({
					sourceId: folder.id,
					targetId: parentFolderId,
					type: 'contained-in-folder',
				});
			}
		}

		if (!relationshipFilter || relationshipFilter.has('tagged-with')) {
			for (const wf of workflowDetails) {
				if (!inScopeWorkflowIdSet.has(wf.id)) continue;
				for (const tag of wf.tags ?? []) {
					edges.push({ sourceId: wf.id, targetId: tag.id, type: 'tagged-with' });
				}
			}
		}

		const triggerTypes = await this.getTriggerTypes([
			...new Set([...activeWorkflowIds, ...referencedNodeIds]),
		]);

		const nodes = this.buildNodes({
			workflowDetails,
			inScopeWorkflowIdSet,
			ownedCredentials,
			dataTables,
			folders,
			depResponse,
			referencedNodeIds,
			allFolders,
			childFoldersByParent,
			triggerTypes,
		});

		const memberList: ProjectGraphMember[] = members.map((m) => ({
			id: m.user.id,
			name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email,
			email: m.user.email,
			role: m.role.slug,
		}));

		const variableList: ProjectGraphVariable[] = variables.map((v) => ({
			id: v.id,
			key: v.key,
			type: v.type,
			scope: v.project ? 'project' : 'global',
		}));

		const stats: ProjectGraphStats = {
			totalWorkflows: inScopeWorkflowIds.length,
			activeWorkflows: workflowDetails.filter(
				(w) => inScopeWorkflowIdSet.has(w.id) && w.activeVersionId !== null,
			).length,
			totalCredentials: ownedCredentials.length,
			totalDataTables: dataTables.length,
			totalFolders: folders.length,
			totalVariables: variableList.length,
			totalMembers: memberList.length,
		};

		return {
			project: {
				id: project.id,
				name: project.name,
				type: project.type,
				icon: project.icon ?? undefined,
				description: project.description ?? undefined,
			},
			nodes,
			edges,
			members: memberList,
			variables: variableList,
			stats,
		};
	}

	private filterWorkflowsByFolder(
		workflows: WorkflowGraphDetails[],
		folderId: string,
		explode: boolean,
		scopedFolderIds: string[],
	): string[] {
		if (explode && folderId !== PROJECT_ROOT) {
			const folderIdSet = new Set(scopedFolderIds);
			return workflows
				.filter((w) => w.parentFolder && folderIdSet.has(w.parentFolder.id))
				.map((w) => w.id);
		}

		if (folderId === PROJECT_ROOT) {
			return workflows.filter((w) => !w.parentFolder).map((w) => w.id);
		}

		return workflows.filter((w) => w.parentFolder?.id === folderId).map((w) => w.id);
	}

	private collectDescendantFolderIds(
		folderId: string,
		childFoldersByParent: Map<string | null, FolderGraphDetails[]>,
	): string[] {
		const descendants: string[] = [];
		const queue = [folderId];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const child of childFoldersByParent.get(current) ?? []) {
				descendants.push(child.id);
				queue.push(child.id);
			}
		}
		return descendants;
	}

	/**
	 * Derive each workflow's primary trigger type from its indexed `nodeType` dependency
	 * rows, picking the most distinctive trigger when a workflow has several.
	 */
	private async getTriggerTypes(workflowIds: string[]): Promise<Map<string, WorkflowTriggerType>> {
		const result = new Map<string, WorkflowTriggerType>();
		if (workflowIds.length === 0) return result;

		const triggerNodeTypes = TRIGGER_NODE_TYPE_MAP.map(([nodeType]) => nodeType);
		const precedence = new Map(triggerNodeTypes.map((nodeType, i) => [nodeType, i]));
		const bestRank = new Map<string, number>();

		for (let i = 0; i < workflowIds.length; i += DEPENDENCY_BATCH_SIZE) {
			const batch = workflowIds.slice(i, i + DEPENDENCY_BATCH_SIZE);
			const rows = await this.workflowDependencyRepository.find({
				where: {
					workflowId: In(batch),
					dependencyType: 'nodeType',
					dependencyKey: In(triggerNodeTypes),
					publishedVersionId: IsNull(),
				},
				select: ['workflowId', 'dependencyKey'],
			});
			for (const row of rows) {
				const rank = precedence.get(row.dependencyKey);
				if (rank === undefined) continue;
				const current = bestRank.get(row.workflowId);
				if (current === undefined || rank < current) {
					bestRank.set(row.workflowId, rank);
					result.set(row.workflowId, TRIGGER_NODE_TYPE_MAP[rank][1]);
				}
			}
		}
		return result;
	}

	/** Fetch owned workflows including archived ones — callers split on `isArchived`. */
	private async getWorkflowDetails(workflowIds: string[]): Promise<WorkflowGraphDetails[]> {
		if (workflowIds.length === 0) return [];
		return await this.workflowRepository.find({
			where: { id: In(workflowIds) },
			relations: { parentFolder: true, tags: true },
			select: {
				id: true,
				name: true,
				activeVersionId: true,
				isArchived: true,
				parentFolder: { id: true },
				tags: { id: true, name: true },
			} as never,
		});
	}

	private async getDependencyEdges(
		workflowIds: string[],
		user: User,
		draft?: boolean,
	): Promise<DependenciesBatchResponse> {
		if (workflowIds.length === 0) return {};
		const result: DependenciesBatchResponse = {};
		for (let i = 0; i < workflowIds.length; i += DEPENDENCY_BATCH_SIZE) {
			const batch = workflowIds.slice(i, i + DEPENDENCY_BATCH_SIZE);
			const batchResult = await this.workflowDependencyQueryService.getResourceDependencies(
				batch,
				'workflow',
				user,
				draft,
			);
			Object.assign(result, batchResult);
		}
		return result;
	}

	private buildNodes(context: {
		workflowDetails: WorkflowGraphDetails[];
		inScopeWorkflowIdSet: Set<string>;
		ownedCredentials: Array<{ credentialsId: string; credentials?: { id: string; name: string } }>;
		dataTables: Array<{ id: string; name: string }>;
		folders: FolderGraphDetails[];
		depResponse: DependenciesBatchResponse;
		referencedNodeIds: Set<string>;
		allFolders: FolderGraphDetails[];
		childFoldersByParent: Map<string | null, FolderGraphDetails[]>;
		triggerTypes: Map<string, WorkflowTriggerType>;
	}): GraphNode[] {
		const {
			workflowDetails,
			inScopeWorkflowIdSet,
			ownedCredentials,
			dataTables,
			folders,
			depResponse,
			referencedNodeIds,
			allFolders,
			childFoldersByParent,
			triggerTypes,
		} = context;

		const nodes: GraphNode[] = [];
		const existingNodeIds = new Set<string>();

		const workflowDetailsById = new Map(workflowDetails.map((wf) => [wf.id, wf]));
		const folderParentById = new Map(allFolders.map((f) => [f.id, f.parentFolderId ?? null]));

		// Ancestor folder IDs from the project root (outermost first) down to the direct parent.
		const folderPathOf = (parentFolderId: string | null | undefined): string[] | undefined => {
			const path: string[] = [];
			let current = parentFolderId ?? null;
			while (current) {
				// Unknown folder (another project) or a cycle — no resolvable path
				if (!folderParentById.has(current) || path.includes(current)) return undefined;
				path.push(current);
				current = folderParentById.get(current) ?? null;
			}
			return path.reverse();
		};

		const directWorkflowCounts = new Map<string, number>();
		for (const wf of workflowDetails) {
			const parentId = wf.parentFolder?.id;
			if (parentId)
				directWorkflowCounts.set(parentId, (directWorkflowCounts.get(parentId) ?? 0) + 1);
		}
		const workflowCountCache = new Map<string, number>();
		const descendantWorkflowCount = (fid: string): number => {
			const cached = workflowCountCache.get(fid);
			if (cached !== undefined) return cached;
			let count = directWorkflowCounts.get(fid) ?? 0;
			for (const child of childFoldersByParent.get(fid) ?? []) {
				count += descendantWorkflowCount(child.id);
			}
			workflowCountCache.set(fid, count);
			return count;
		};

		for (const wf of workflowDetails) {
			if (!inScopeWorkflowIdSet.has(wf.id)) continue;
			nodes.push({
				id: wf.id,
				type: 'workflow',
				name: wf.name ?? wf.id,
				expanded: true,
				metadata: {
					active: wf.activeVersionId !== null,
					archived: wf.isArchived ?? false,
					parentFolderId: wf.parentFolder?.id ?? null,
					folderPath: folderPathOf(wf.parentFolder?.id),
					triggerType: triggerTypes.get(wf.id) ?? 'none',
				},
			});
			existingNodeIds.add(wf.id);
		}

		for (const folder of folders) {
			nodes.push({
				id: folder.id,
				type: 'folder',
				name: folder.name,
				expanded: true,
				metadata: {
					parentFolderId: folder.parentFolderId ?? null,
					workflowCount: descendantWorkflowCount(folder.id),
				},
			});
			existingNodeIds.add(folder.id);
		}

		for (const cred of ownedCredentials) {
			nodes.push({
				id: cred.credentialsId,
				type: 'credential',
				name: cred.credentials?.name ?? cred.credentialsId,
				expanded: true,
				metadata: {},
			});
			existingNodeIds.add(cred.credentialsId);
		}

		for (const dt of dataTables) {
			nodes.push({
				id: dt.id,
				type: 'dataTable',
				name: dt.name,
				expanded: true,
				metadata: {},
			});
			existingNodeIds.add(dt.id);
		}

		for (const wf of workflowDetails) {
			if (!inScopeWorkflowIdSet.has(wf.id)) continue;
			for (const tag of wf.tags ?? []) {
				if (!existingNodeIds.has(tag.id)) {
					nodes.push({
						id: tag.id,
						type: 'tag',
						name: tag.name,
						expanded: true,
						metadata: {},
					});
					existingNodeIds.add(tag.id);
				}
			}
		}

		for (const refId of referencedNodeIds) {
			if (existingNodeIds.has(refId)) continue;

			const depEntry = Object.values(depResponse)
				.flatMap((r) => r.dependencies)
				.find((d) => d.id === refId);
			if (!depEntry) continue;

			const isWorkflowDep =
				depEntry.type === 'workflowCall' ||
				depEntry.type === 'aiToolWorkflowCall' ||
				depEntry.type === 'errorWorkflow' ||
				depEntry.type === 'workflowParent' ||
				depEntry.type === 'aiToolWorkflowParent' ||
				depEntry.type === 'errorWorkflowParent';

			// A referenced same-project workflow (living in a folder outside the scoped level)
			// is present in workflowDetails; without its folder chain the client cannot
			// re-route edges to the correct collapsed ancestor folder.
			const details = isWorkflowDep ? workflowDetailsById.get(refId) : undefined;

			nodes.push({
				id: refId,
				type: isWorkflowDep
					? 'workflow'
					: depEntry.type === 'credentialId'
						? 'credential'
						: 'dataTable',
				name: depEntry.name,
				projectId: depEntry.projectId,
				expanded: false,
				metadata: isWorkflowDep
					? {
							...(details
								? {
										active: details.activeVersionId !== null,
										archived: details.isArchived ?? false,
										parentFolderId: details.parentFolder?.id ?? null,
										folderPath: folderPathOf(details.parentFolder?.id),
									}
								: {}),
							triggerType: triggerTypes.get(refId) ?? 'none',
						}
					: {},
			});
			existingNodeIds.add(refId);
		}

		return nodes;
	}

	private async getVariables(user: User, projectId: string) {
		const { VariablesService } = await import('@/environments.ee/variables/variables.service.ee');
		const variablesService = Container.get(VariablesService);
		return await variablesService.getAllForUser(user, { projectId });
	}
}
