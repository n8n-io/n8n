import type { InjectionKey } from 'vue';

export type ConnectionItemKind =
	| 'node'
	| 'workflow'
	| 'mcp-server'
	| 'agent'
	| 'data-store'
	| 'service';

export type ToolIconSource =
	| { type: 'file'; src: string }
	| { type: 'icon'; name: string; color?: string };

export interface ToolCredentialRef {
	authType: string;
	credentialId?: string;
	required?: boolean;
}

export interface BaseConnectionItem {
	id: string;
	title: string;
	description?: string;
	iconSource?: ToolIconSource;
	isConnected: boolean;
	credentials?: ToolCredentialRef[];
	longDescription?: string;
	/** Tab this item belongs to. Falls back to `CATEGORY_BY_KIND` when unset. */
	category?: ToolCategoryKey;
	/** Reviewed and approved by n8n. Drives the shield badge, install state irrelevant. */
	verified?: boolean;
	/** Not yet installed: swaps the Connect action for an Install one. */
	communityPreview?: boolean;
	installing?: boolean;
	/** Non-admin cannot install; the action is disabled with a contact-admin tooltip. */
	installDisabled?: boolean;
}

export interface NodeConnectionItem extends BaseConnectionItem {
	kind: 'node';
	nodeTypeName: string;
}

export interface WorkflowConnectionItem extends BaseConnectionItem {
	kind: 'workflow';
	workflowId: string;
}

export interface McpServerTool {
	id: string;
	name: string;
	description?: string;
	/** Partitions tools into READ TOOLS / WRITE TOOLS chips in the detail view. */
	category?: 'read' | 'write';
}

export interface PublisherInfo {
	name: string;
	url?: string;
}

export type McpToolInclusionMode = 'all' | 'selected' | 'except';

export interface McpToolSettings {
	inclusionMode: McpToolInclusionMode;
	selectedTools: string[];
	excludedTools: string[];
}

export type ToolConnectionSettings = McpToolSettings;

export interface McpServerConnectionItem extends BaseConnectionItem {
	kind: 'mcp-server';
	availableTools: McpServerTool[];
	settings?: McpToolSettings;
	publisher?: PublisherInfo;
	version?: string;
	docsUrl?: string;
}

export interface AgentConnectionItem extends BaseConnectionItem {
	kind: 'agent';
	agentId: string;
}

export interface DataStoreConnectionItem extends BaseConnectionItem {
	kind: 'data-store';
	dataStoreId: string;
}

export interface ServiceConnectionItem extends BaseConnectionItem {
	kind: 'service';
	serviceId: string;
}

export type ToolConnectionItem =
	| NodeConnectionItem
	| WorkflowConnectionItem
	| McpServerConnectionItem
	| AgentConnectionItem
	| DataStoreConnectionItem
	| ServiceConnectionItem;

/**
 * One tab in the modal. Consumers declare the subset they support; `agents` and
 * `data` have no supplier yet and are reserved for folding the sub-agent and
 * vector-store pickers in later.
 */
export type ToolCategoryKey =
	| 'all'
	| 'connected'
	| 'built-in'
	| 'mcp'
	| 'ai'
	| 'n8n'
	| 'app-action'
	| 'community'
	| 'workflows'
	| 'agents'
	| 'data';

/** Used when an item carries no explicit `category`. */
export const CATEGORY_BY_KIND: Record<ConnectionItemKind, ToolCategoryKey> = {
	node: 'app-action',
	workflow: 'workflows',
	'mcp-server': 'mcp',
	service: 'built-in',
	agent: 'agents',
	'data-store': 'data',
};

/**
 * A type alias, not an interface: N8nRecycleScroller requires an implicit
 * index signature, which interfaces do not get.
 */
export type FlattenedRow = {
	key: string;
	item: ToolConnectionItem;
};

export interface PickableCredential {
	id: string;
	name: string;
	type: string;
}

/**
 * Read-only credentials lookup + create/edit triggers. Injected by each
 * consumer at the modal mount site so the shared module doesn't import
 * editor-ui stores (which would break Storybook's dev-server bundling).
 */
export interface ToolConnectionCredentialAdapter {
	getCredentialsByType: (authType: string) => readonly PickableCredential[];
	openNewCredential: (authType: string) => void;
	openExistingCredential: (credentialId: string) => void;
}

export const TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY = Symbol(
	'tool-connection-credential-adapter',
) as InjectionKey<ToolConnectionCredentialAdapter | null>;
