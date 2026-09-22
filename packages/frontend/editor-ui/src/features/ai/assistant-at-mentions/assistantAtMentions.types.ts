import type { Ref } from 'vue';

export type AssistantMentionKind = 'workflow' | 'node' | 'group';

export type AssistantMentionSourceId = 'artifacts' | 'workflows';

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
