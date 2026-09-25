import type { Ref } from 'vue';
import type { InstanceAiResourceAttachment } from '@n8n/api-types';

export type AssistantMentionKind = 'workflow' | 'node' | 'group';

export type AssistantMentionSourceId = 'artifacts' | 'workflows';

export type AssistantMentionTriggerSource = 'typed' | 'button';

/**
 * Why the picker closed. `selected` is the only outcome that is not a dismissal.
 * `closed_menu` covers Escape, a click outside and focus loss, which the menu
 * reports as one close; `unavailable` is mentions turning off while the picker
 * was open, e.g. a send starting or the project changing.
 */
export type AssistantMentionCloseReason =
	| 'selected'
	| 'closed_menu'
	| 'deleted_trigger'
	| 'moved_caret'
	| 'unavailable';

export interface AssistantMentionCloseInfo {
	source: AssistantMentionTriggerSource;
	reason: AssistantMentionCloseReason;
	durationMs: number;
}

/** What the picker showed when it closed. Counts cover top-level rows only. */
export interface AssistantMentionPickerOpenMetrics {
	mode: 'browse' | 'search';
	queryLength: number;
	resultCount: number;
	ambiguousResultCount: number;
	submenuOpenCount: number;
}

export interface AssistantMentionItem {
	key: string;
	kind: AssistantMentionKind;
	source: AssistantMentionSourceId;
	label: string;
	breadcrumbs: string[];
	workflowId: string;
	entityId: string;
	workflowName: string;
	groupId?: string;
	groupName?: string;
	nodeTypeName?: string;
	nodeTypeVersion?: number;
	nodeCount?: number;
	description?: string;
	hasChildren?: boolean;
	children?: AssistantMentionItem[];
}

export interface AssistantMentionBrowseSection {
	id: AssistantMentionSourceId;
	items: AssistantMentionItem[];
}

export interface MentionSourceProvider {
	id: AssistantMentionSourceId;
	revision?: Readonly<Ref<number>>;
	browse(): Promise<AssistantMentionItem[]>;
	search(query: string): Promise<AssistantMentionItem[]>;
}

export interface WorkflowArtifactReference {
	id: string;
	name: string;
}

export interface WorkflowArtifactIndexNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
}

export interface WorkflowArtifactIndexGroup {
	id: string;
	name: string;
	nodeIds: string[];
}

export interface WorkflowArtifactIndex {
	workflowId: string;
	workflowName: string;
	versionId: string;
	nodes: WorkflowArtifactIndexNode[];
	groups: WorkflowArtifactIndexGroup[];
	nodesById: Map<string, WorkflowArtifactIndexNode>;
	groupsById: Map<string, WorkflowArtifactIndexGroup>;
	nodeIdToGroupId: Map<string, string>;
}

export type WorkflowArtifactIndexStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkflowArtifactIndexEntry {
	status: WorkflowArtifactIndexStatus;
	source?: 'active' | 'fetched';
	index?: WorkflowArtifactIndex;
	error?: unknown;
}

export interface AssistantMentionSelection {
	item: AssistantMentionItem;
	attachment: InstanceAiResourceAttachment;
	truncated: boolean;
	telemetry?: {
		mode: 'browse' | 'search';
		resultPosition: number;
		queryLength: number;
	};
}

export interface AssistantMentionCounts {
	mentionCount: number;
	workflowMentionCount: number;
	nodeMentionCount: number;
	groupMentionCount: number;
}

export const EMPTY_ASSISTANT_MENTION_COUNTS: AssistantMentionCounts = {
	mentionCount: 0,
	workflowMentionCount: 0,
	nodeMentionCount: 0,
	groupMentionCount: 0,
};

export interface AssistantMentionArtifactReference {
	referenceId: string;
	workflowId: string;
	workflowName: string;
}
