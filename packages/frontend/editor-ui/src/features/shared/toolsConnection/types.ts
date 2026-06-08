import type { InjectionKey } from 'vue';

export type ConnectionItemKind = 'node' | 'workflow' | 'mcp-server' | 'agent' | 'data-store';

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

export type ToolConnectionItem =
	| NodeConnectionItem
	| WorkflowConnectionItem
	| McpServerConnectionItem
	| AgentConnectionItem
	| DataStoreConnectionItem;

export type SectionKey = 'connected' | 'nodes' | 'agents' | 'data' | 'workflows';

export type TabId = 'services' | 'agents' | 'data' | 'workflows';

export const SECTION_TAB: Record<SectionKey, TabId> = {
	connected: 'services',
	nodes: 'services',
	agents: 'agents',
	data: 'data',
	workflows: 'workflows',
};

export const TAB_ORDER: TabId[] = ['services', 'agents', 'data', 'workflows'];

export type FlattenedRow =
	| { kind: 'section-header'; key: string; section: SectionKey; title: string; count: number }
	| { kind: 'item'; key: string; section: SectionKey; item: ToolConnectionItem };

export interface PickableCredential {
	id: string;
	name: string;
	type: string;
}

/**
 * Read-only credentials lookup + "create new" trigger. Injected by each
 * consumer at the modal mount site so the shared module doesn't import
 * editor-ui stores (which would break Storybook's dev-server bundling).
 */
export interface ToolConnectionCredentialAdapter {
	getCredentialsByType: (authType: string) => readonly PickableCredential[];
	openNewCredential: (authType: string) => void;
}

export const TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY = Symbol(
	'tool-connection-credential-adapter',
) as InjectionKey<ToolConnectionCredentialAdapter | null>;
