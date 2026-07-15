import type { ProjectDependencyGraph, RelationshipType, WorkflowTriggerType } from '@n8n/api-types';

/** Relationship types drawn as edges on the project canvas. */
export type WorkflowRelationType = 'calls-workflow' | 'uses-as-tool' | 'handles-errors-for';

export const WORKFLOW_RELATION_TYPES: WorkflowRelationType[] = [
	'calls-workflow',
	'uses-as-tool',
	'handles-errors-for',
];

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
}

export interface GraphCredentialLink {
	workflowId: string;
	credentialId: string;
}

export interface GraphModel {
	workflows: Map<string, GraphWorkflowUnit>;
	folders: Map<string, GraphFolderUnit>;
	relations: GraphRelation[];
	/** Workflow IDs that are the target of at least one uses-as-tool relation. */
	toolTargets: Set<string>;
	/** Credentials owned or referenced by the project's workflows (Atlas only). */
	credentials: Map<string, GraphCredentialUnit>;
	credentialLinks: GraphCredentialLink[];
}

export interface VisibleEdge {
	id: string;
	source: string;
	target: string;
	type: WorkflowRelationType;
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
				credentials.set(node.id, { id: node.id, name: node.name });
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
			if (edge.type === 'uses-credential') {
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

	return { workflows, folders, relations, toolTargets, credentials, credentialLinks };
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
 * Edges between what is actually on canvas: every relation endpoint re-routed to its
 * outermost collapsed ancestor folder, deduplicated per (source, target, type). Edges
 * whose endpoints resolve to the same visible node are dropped.
 */
export function resolveVisibleEdges(
	model: GraphModel,
	expandedFolders: ReadonlySet<string>,
	visibleTypes: ReadonlySet<WorkflowRelationType>,
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
	return [...edges.values()];
}
