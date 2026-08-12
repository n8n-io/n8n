/** Where a workflow content search matched, ordered by result priority. */
export const workflowContentMatchTypes = [
	'name',
	'nodeName',
	'nodeParameters',
	'description',
	'history',
	'other',
	'historyContent',
] as const;

export type WorkflowContentMatchType = (typeof workflowContentMatchTypes)[number];

export interface WorkflowContentSearchItem {
	id: string;
	name: string;
	description: string | null;
	versionId: string;
	activeVersionId: string | null;
	createdAt: string;
	updatedAt: string;
	triggerCount: number;
	availableInMCP: boolean;
	matchedIn: WorkflowContentMatchType;
	/** The matched node name, version name, or tag name, when applicable. */
	matchDetail?: string;
	/** ID of the matched node, for node name/parameter matches. */
	matchedNodeId?: string;
	/** ID of the matched version, for history and past-version matches. */
	matchedVersionId?: string;
	tags: Array<{ id: string; name: string }>;
	parentFolder: { id: string; name: string; parentFolderId: string | null } | null;
	homeProject: {
		id: string;
		name: string;
		type: 'personal' | 'team';
		icon: { type: 'icon' | 'emoji'; value: string } | null;
	} | null;
}

export interface WorkflowContentSearchResult {
	results: WorkflowContentSearchItem[];
	/** Number of results returned; capped by the requested limit, not a total. */
	count: number;
}
