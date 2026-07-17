import type { WorkflowTriggerType } from '@n8n/api-types';
import type { InjectionKey, Ref } from 'vue';

import type { WorkflowRelationType } from './graph-model';

export interface ProjectNodeData {
	kind: 'workflow' | 'folder' | 'credential' | 'resource';
	name: string;
	active?: boolean;
	triggerType?: WorkflowTriggerType;
	/** Target of a uses-as-tool edge — overrides icon/label to "Tool workflow". */
	isToolTarget?: boolean;
	/** Workflow from another project. */
	external?: boolean;
	/** Folder: recursive workflow count for the pill. */
	workflowCount?: number;
	/** Credential: number of workflows using this credential. */
	credentialUsageCount?: number;
	/** Credential: the credential type name (e.g. 'slackApi') — used to resolve the icon. */
	credentialType?: string;
	/** Resource: the node type that defines this resource (e.g. 'n8n-nodes-base.slack'). */
	nodeType?: string;
	[key: string]: unknown;
}

export interface ProjectContainerData {
	folderId: string;
	name: string;
	workflowCount: number;
	width: number;
	height: number;
	[key: string]: unknown;
}

export interface ProjectEdgeData {
	relationshipType: WorkflowRelationType;
	/** Operation label for accesses-resource edges (e.g. 'send', 'POST'). */
	operation?: string;
	/** Credential type for credential edges — used to resolve the icon color. */
	credentialType?: string;
	/** Read/write direction for credential edges — determines left/right routing. */
	direction?: 'read' | 'write' | 'unknown';
	[key: string]: unknown;
}

/** What kind of element a canvas press started on. */
export type CanvasPressKind = 'workflow' | 'folder' | 'container' | 'credential';

/** Interaction context provided by ProjectCanvas to its node/container components. */
export interface ProjectCanvasContext {
	hoveredNodeId: Ref<string | null>;
	dropHotId: Ref<string | null>;
	liftedId: Ref<string | null>;
	/** Set of workflow IDs currently selected via rubber-band selection. */
	selectedIds: Ref<Set<string>>;
	/** Leftmost x of any visible unit — backward edges loop around it. */
	contentLeftX: Ref<number>;
	/** Lowest bottom y of any visible unit — backward edges run beneath it. */
	contentBottomY: Ref<number>;
	onCardPointerDown: (id: string, kind: CanvasPressKind, event: PointerEvent) => void;
	/** Navigate to the new-workflow editor, creating inside the folder (null = project root). */
	onAddWorkflow: (folderId: string | null) => void;
	/** Prompt for a name and create a folder inside the parent (null = project root). */
	onAddFolder: (parentFolderId: string | null) => void;
	/** Open the canvas context menu for a card or container. */
	onOpenContextMenu: (id: string, kind: CanvasPressKind, event: MouseEvent) => void;
}

export const ProjectCanvasContextKey: InjectionKey<ProjectCanvasContext> =
	Symbol('project-canvas-context');
