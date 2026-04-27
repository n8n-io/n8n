// packages/@n8n/agents/src/toolsets/types.ts
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

export type AppOperationStatus = 'available' | 'caution' | 'missing-scope';

export interface OperationCuration {
	/** OAuth scopes the underlying API endpoint requires. */
	requiredScopes?: string[];
	/** Mailbox/state-mutating; surfaces as "caution" in the UI. */
	destructive?: boolean;
}

export interface AppDefinition {
	/** Stable kind; persisted on AgentJsonAppRef and used as registry key. */
	kind: string;
	label: string;
	icon: string;

	nodeType: string;
	nodeTypeVersion: number;
	credentialType: string;

	disabled?: boolean;

	/**
	 * LLM-facing description shown to the agent as the dispatcher tool's description.
	 * - string: hand-written blob
	 * - function: derive from the loaded node description at runtime
	 * - undefined: use the default deriver (label + grouped operations)
	 */
	manifest?: string | ((description: INodeTypeDescription) => string);

	/** Per-op curation, keyed by canonical "resource:operation". */
	operations?: Record<string, OperationCuration>;

	scopes: {
		/**
		 * Optional wildcard scope. If granted, satisfies any required scope under
		 * the wildcard's prefix (e.g. https://mail.google.com/ subsumes gmail.*).
		 */
		fullAccessScope?: string;
	};
}

export interface OperationEntry {
	/** "resource:operation" — canonical name. */
	name: string;
	resource: string;
	operation: string;
	displayName: string;
	description: string;
	/** Filtered INodeProperties[] for this op — feeds generateZodSchema. */
	properties: INodeProperties[];
	/** Required parameter names — fed to generateZodSchema alongside `properties`. */
	required: string[];
	requiredScopes: string[];
	destructive: boolean;
	/** Omitted when grantedScopes is not provided (loading state). */
	status?: AppOperationStatus;
	/** Populated alongside `status`; explains why the operation is flagged or unavailable. */
	statusReason?: string;
}
