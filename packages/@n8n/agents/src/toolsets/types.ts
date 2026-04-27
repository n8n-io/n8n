// packages/@n8n/agents/src/toolsets/types.ts
import type { INodeProperties } from 'n8n-workflow';

/**
 * Registry entry — purely the wiring needed to find the underlying node and
 * credential. Operations and the LLM-facing manifest are derived from the
 * loaded node description, not hand-curated here.
 */
export interface AppDefinition {
	/** Stable kind; persisted on AgentJsonAppRef and used as registry key. */
	kind: string;
	nodeType: string;
	nodeTypeVersion: number;
	credentialType: string;
	disabled?: boolean;
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
}
