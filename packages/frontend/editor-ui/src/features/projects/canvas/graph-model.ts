import type { ProjectDependencyGraph, RelationshipType, WorkflowTriggerType } from '@n8n/api-types';

/** Direction of a credential edge — determines which side of the node it connects to. */
export type OperationDirection = 'read' | 'write' | 'unknown';

/** Relationship types drawn as edges on the project canvas. */
export type WorkflowRelationType =
	| 'accesses-resource'
	| 'calls-workflow'
	| 'handles-errors-for'
	| 'uses-as-tool'
	| 'uses-credential';

export const WORKFLOW_RELATION_TYPES: WorkflowRelationType[] = [
	'accesses-resource',
	'calls-workflow',
	'handles-errors-for',
	'uses-as-tool',
	'uses-credential',
];

const READ_OPS = new Set([
	'get',
	'list',
	'read',
	'fetch',
	'retrieve',
	'search',
	'query',
	'count',
	'check',
	'getmany',
	'getone',
	'getall',
	'find',
	'view',
	'show',
	'lookup',
]);
const WRITE_OPS = new Set([
	'send',
	'create',
	'post',
	'update',
	'upsert',
	'delete',
	'remove',
	'put',
	'patch',
	'execute',
	'write',
	'add',
	'insert',
	'publish',
	'archive',
	'move',
]);

/**
 * Classify an operation as read or write based on the operation string and node type.
 * HTTP methods are classified directly; other nodes use a heuristic on common verbs.
 */
export function classifyOperation(
	operation: string | undefined,
	nodeType?: string,
): OperationDirection {
	if (!operation) return 'unknown';
	const op = operation.toLowerCase().trim();
	if (nodeType?.includes('httpRequest')) {
		if (['get', 'head', 'options'].includes(op)) return 'read';
		if (['post', 'put', 'patch', 'delete'].includes(op)) return 'write';
		return 'unknown';
	}
	if (READ_OPS.has(op)) return 'read';
	if (WRITE_OPS.has(op)) return 'write';
	return 'unknown';
}

export interface GraphWorkflowUnit {
	id: string;
	name: string;
	active: boolean;
	triggerType: WorkflowTriggerType;
	/** Direct parent folder ID, null = project root. */
	parentFolderId: string | null;
	/** Ancestor folder IDs from project root (outermost first). Null = unknown (external). */
	folderPath: string[] | null;
	/** Belongs to another project (or placement unknown) — always rendered at root level. */
	external: boolean;
}

export interface GraphFolderUnit {
	id: string;
	name: string;
	parentFolderId: string | null;
	/** Recursive count of workflows inside, computed by the server. */
	workflowCount: number;
}

export interface GraphRelation {
	source: string;
	target: string;
	type: WorkflowRelationType;
}

export interface GraphCredentialUnit {
	id: string;
	name: string;
	/** Credential type name (e.g. 'slackApi') — used to resolve the icon. */
	type?: string;
}

export interface GraphCredentialLink {
	workflowId: string;
	credentialId: string;
}

export interface GraphResourceUnit {
	id: string;
	name: string;
	nodeType: string;
}

/** Workflow → Resource edge, carrying the operation label. */
export interface GraphResourceLink {
	workflowId: string;
	resourceId: string;
	operation?: string;
	nodeType?: string;
}

/** Resource → Credential edge. */
export interface GraphResourceCredentialLink {
	resourceId: string;
	credentialId: string;
}

export interface GraphModel {
	workflows: Map<string, GraphWorkflowUnit>;
	folders: Map<string, GraphFolderUnit>;
	relations: GraphRelation[];
	/** Workflow IDs that are the target of at least one uses-as-tool relation. */
	toolTargets: Set<string>;
	/** Credentials owned or referenced by the project's workflows. */
	credentials: Map<string, GraphCredentialUnit>;
	credentialLinks: GraphCredentialLink[];
	/** Resources (API endpoints / node resources) discovered in credential deps. */
	resources: Map<string, GraphResourceUnit>;
	/** Workflow → Resource edges with operation labels. */
	resourceLinks: GraphResourceLink[];
	/** Resource → Credential edges. */
	resourceCredentialLinks: GraphResourceCredentialLink[];
}

export interface VisibleEdge {
	id: string;
	source: string;
	target: string;
	type: WorkflowRelationType;
	/** Operation label for accesses-resource edges. */
	operation?: string;
	/** Read/write direction for credential edges — determines left/right routing. */
	direction?: OperationDirection;
}

function isWorkflowRelationType(type: RelationshipType): type is WorkflowRelationType {
	return (WORKFLOW_RELATION_TYPES as RelationshipType[]).includes(type);
}

/**
 * Merge the per-folder graph responses into one client-side model. Later graphs refine
 * earlier ones: an in-scope workflow node (expanded=true) wins over a referenced ghost of
 * the same workflow, and referenced ghosts with folder metadata win over ones without.
 */
export function buildGraphModel(graphs: ProjectDependencyGraph[]): GraphModel {
	const workflows = new Map<string, GraphWorkflowUnit>();
	const folders = new Map<string, GraphFolderUnit>();
	const relations: GraphRelation[] = [];
	const relationKeys = new Set<string>();
	const toolTargets = new Set<string>();
	const credentials = new Map<string, GraphCredentialUnit>();
	const credentialLinks: GraphCredentialLink[] = [];
	const credentialLinkKeys = new Set<string>();
	const resources = new Map<string, GraphResourceUnit>();
	const resourceLinks: GraphResourceLink[] = [];
	const resourceLinkKeys = new Set<string>();
	const resourceCredentialLinks: GraphResourceCredentialLink[] = [];
	const resourceCredentialKeys = new Set<string>();

	for (const graph of graphs) {
		for (const node of graph.nodes) {
			if (node.type === 'folder') {
				folders.set(node.id, {
					id: node.id,
					name: node.name,
					parentFolderId: node.metadata.parentFolderId ?? null,
					workflowCount: node.metadata.workflowCount ?? 0,
				});
				continue;
			}
			if (node.type === 'credential') {
				credentials.set(node.id, {
					id: node.id,
					name: node.name,
					type: node.metadata.credentialType,
				});
				continue;
			}
			if (node.type === 'resource') {
				resources.set(node.id, {
					id: node.id,
					name: node.name,
					nodeType: node.metadata.nodeType ?? '',
				});
				continue;
			}
			if (node.type !== 'workflow') continue;

			const folderPath = node.metadata.folderPath ?? null;
			const unit: GraphWorkflowUnit = {
				id: node.id,
				name: node.name,
				active: node.metadata.active ?? false,
				triggerType: node.metadata.triggerType ?? 'subworkflow',
				parentFolderId: node.metadata.parentFolderId ?? null,
				folderPath,
				external: folderPath === null,
			};

			const existing = workflows.get(node.id);
			// In-scope data is authoritative; a ghost with a resolved folder path beats one without
			const replace = !existing || node.expanded || (existing.external && !unit.external);
			if (replace) workflows.set(node.id, unit);
		}

		for (const edge of graph.edges) {
			if (edge.type === 'accesses-resource') {
				const key = `${edge.sourceId}→${edge.targetId}:${edge.metadata?.operation ?? ''}`;
				if (resourceLinkKeys.has(key)) continue;
				resourceLinkKeys.add(key);
				resourceLinks.push({
					workflowId: edge.sourceId,
					resourceId: edge.targetId,
					operation: edge.metadata?.operation,
					nodeType: edge.metadata?.nodeType,
				});
				continue;
			}
			if (edge.type === 'uses-credential') {
				// Resource → Credential link (the second hop of a split credential dep)
				const sourceIsResource = resources.has(edge.sourceId);
				if (sourceIsResource) {
					const key = `${edge.sourceId}→${edge.targetId}`;
					if (resourceCredentialKeys.has(key)) continue;
					resourceCredentialKeys.add(key);
					resourceCredentialLinks.push({
						resourceId: edge.sourceId,
						credentialId: edge.targetId,
					});
					continue;
				}
				// Direct workflow → credential link (no resource metadata)
				const key = `${edge.sourceId}→${edge.targetId}`;
				if (credentialLinkKeys.has(key)) continue;
				credentialLinkKeys.add(key);
				credentialLinks.push({ workflowId: edge.sourceId, credentialId: edge.targetId });
				continue;
			}
			if (!isWorkflowRelationType(edge.type)) continue;
			const key = `${edge.sourceId}→${edge.targetId}:${edge.type}`;
			if (relationKeys.has(key)) continue;
			relationKeys.add(key);
			relations.push({ source: edge.sourceId, target: edge.targetId, type: edge.type });
			if (edge.type === 'uses-as-tool') toolTargets.add(edge.targetId);
		}
	}

	return {
		workflows,
		folders,
		relations,
		toolTargets,
		credentials,
		credentialLinks,
		resources,
		resourceLinks,
		resourceCredentialLinks,
	};
}

/**
 * The entity actually shown on canvas for a workflow: itself, or its outermost
 * collapsed ancestor folder.
 */
export function endpointOf(
	model: GraphModel,
	expandedFolders: ReadonlySet<string>,
	workflowId: string,
): string {
	const workflow = model.workflows.get(workflowId);
	if (!workflow?.folderPath) return workflowId;
	for (const folderId of workflow.folderPath) {
		if (!expandedFolders.has(folderId)) return folderId;
	}
	return workflowId;
}

/** Parent folder of an entity (workflow or folder), null = project root. */
export function parentOf(model: GraphModel, id: string): string | null {
	const folder = model.folders.get(id);
	if (folder) return folder.parentFolderId;
	const workflow = model.workflows.get(id);
	if (!workflow || workflow.external) return null;
	return workflow.parentFolderId;
}

/** Whether the entity's ancestor chain is fully expanded (so it appears on canvas). */
export function isEntityVisible(
	model: GraphModel,
	expandedFolders: ReadonlySet<string>,
	id: string,
): boolean {
	let current = parentOf(model, id);
	let guard = 0;
	while (current) {
		if (!expandedFolders.has(current)) return false;
		current = model.folders.get(current)?.parentFolderId ?? null;
		if (guard++ > 100) return false;
	}
	return true;
}

export function folderDepth(model: GraphModel, folderId: string): number {
	let depth = 0;
	let current = model.folders.get(folderId)?.parentFolderId ?? null;
	while (current && depth <= 100) {
		depth++;
		current = model.folders.get(current)?.parentFolderId ?? null;
	}
	return depth;
}

export interface ChildEntity {
	id: string;
	isFolder: boolean;
}

/**
 * Entities directly inside a folder (null = project root). External workflows are
 * treated as root-level units. Only meaningful for the root and fetched (expanded)
 * folders — an unfetched folder has no known children.
 */
export function childEntities(model: GraphModel, folderId: string | null): ChildEntity[] {
	const children: ChildEntity[] = [];
	for (const folder of model.folders.values()) {
		if (folder.parentFolderId === folderId) children.push({ id: folder.id, isFolder: true });
	}
	for (const workflow of model.workflows.values()) {
		const parent = workflow.external ? null : workflow.parentFolderId;
		if (parent === folderId) children.push({ id: workflow.id, isFolder: false });
	}
	return children;
}

/**
 * All operations a workflow performs through resources connected to a given credential.
 * Returns array of { operation, nodeType } by walking resourceLinks → resourceCredentialLinks.
 */
export function operationsForCredential(
	model: GraphModel,
	workflowId: string,
	credentialId: string,
): Array<{ operation?: string; nodeType?: string }> {
	const result: Array<{ operation?: string; nodeType?: string }> = [];
	// Find resources connected to this credential
	const resourceIds = new Set(
		model.resourceCredentialLinks
			.filter((l) => l.credentialId === credentialId)
			.map((l) => l.resourceId),
	);
	// Find resource links from this workflow to those resources
	for (const link of model.resourceLinks) {
		if (link.workflowId === workflowId && resourceIds.has(link.resourceId)) {
			result.push({ operation: link.operation, nodeType: link.nodeType });
		}
	}
	return result;
}

/**
 * Edges between what is actually on canvas: every relation endpoint re-routed to its
 * outermost collapsed ancestor folder, deduplicated per (source, target, type). Edges
 * whose endpoints resolve to the same visible node are dropped.
 *
 * Credential/resource edges are classified as read or write based on the operation.
 * When a selectedCredentialId is provided, only edges involving that credential
 * (and its resources) are produced.
 */
export function resolveVisibleEdges(
	model: GraphModel,
	expandedFolders: ReadonlySet<string>,
	visibleTypes: ReadonlySet<WorkflowRelationType>,
	selectedCredentialId: string | null = null,
): VisibleEdge[] {
	const edges = new Map<string, VisibleEdge>();
	for (const relation of model.relations) {
		if (!visibleTypes.has(relation.type)) continue;
		const source = endpointOf(model, expandedFolders, relation.source);
		const target = endpointOf(model, expandedFolders, relation.target);
		if (source === target) continue;
		const id = `${source}→${target}:${relation.type}`;
		if (!edges.has(id)) edges.set(id, { id, source, target, type: relation.type });
	}

	// When a single credential is selected, only show edges for that credential + its resources
	const credFilter = (credId: string) => !selectedCredentialId || credId === selectedCredentialId;

	if (visibleTypes.has('accesses-resource')) {
		for (const link of model.resourceLinks) {
			// If a credential is selected, only show resource links for resources connected to it
			if (selectedCredentialId) {
				const connected = model.resourceCredentialLinks.some(
					(l) => l.resourceId === link.resourceId && credFilter(l.credentialId),
				);
				if (!connected) continue;
			}
			const source = endpointOf(model, expandedFolders, link.workflowId);
			const target = link.resourceId;
			if (source === target) continue;
			const direction = classifyOperation(link.operation, link.nodeType);
			// One edge per direction per (workflow, resource) pair
			const id = `${source}→${target}:accesses-resource:${direction}`;
			if (!edges.has(id))
				edges.set(id, {
					id,
					source,
					target,
					type: 'accesses-resource',
					operation: link.operation,
					direction,
				});
		}
	}

	if (visibleTypes.has('uses-credential')) {
		// Resource → Credential edges: classified by the operations performed through each resource
		for (const link of model.resourceCredentialLinks) {
			if (!credFilter(link.credentialId)) continue;
			// Find all operations that workflows perform through this resource
			const ops = model.resourceLinks
				.filter((rl) => rl.resourceId === link.resourceId)
				.map((rl) => ({ operation: rl.operation, nodeType: rl.nodeType }));
			const hasWrite = ops.some((o) => classifyOperation(o.operation, o.nodeType) === 'write');
			const hasRead = ops.some((o) => classifyOperation(o.operation, o.nodeType) === 'read');
			const hasUnknown = ops.some((o) => classifyOperation(o.operation, o.nodeType) === 'unknown');
			const directions: OperationDirection[] = [];
			if (hasWrite || hasUnknown || ops.length === 0) directions.push('write');
			if (hasRead) directions.push('read');
			for (const dir of directions) {
				const id = `${link.resourceId}→${link.credentialId}:uses-credential:${dir}`;
				if (!edges.has(id))
					edges.set(id, {
						id,
						source: link.resourceId,
						target: link.credentialId,
						type: 'uses-credential',
						direction: dir,
					});
			}
		}

		// Direct workflow → credential links (no resource): default to write
		for (const link of model.credentialLinks) {
			if (!credFilter(link.credentialId)) continue;
			const source = endpointOf(model, expandedFolders, link.workflowId);
			const target = link.credentialId;
			if (source === target) continue;
			const id = `${source}→${target}:uses-credential:write`;
			if (!edges.has(id))
				edges.set(id, {
					id,
					source,
					target,
					type: 'uses-credential',
					direction: 'write',
				});
		}
	}

	return [...edges.values()];
}
