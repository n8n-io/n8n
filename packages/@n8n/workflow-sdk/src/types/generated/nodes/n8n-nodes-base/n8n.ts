/**
 * n8n Node Types
 *
 * Handle events and perform actions on your n8n instance
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/n8n/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Generate a security audit for this n8n instance */
export type N8nV1AuditGenerateConfig = {
	resource: 'audit';
	operation: 'generate';
	additionalOptions?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1CredentialCreateConfig = {
	resource: 'credential';
	operation: 'create';
	/**
	 * Name of the new credential
	 * @displayOptions.show { resource: ["credential"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * The available types depend on nodes installed on the n8n instance. Some built-in types include e.g. 'githubApi', 'notionApi', and 'slackApi'.
	 * @displayOptions.show { resource: ["credential"], operation: ["create"] }
	 */
	credentialTypeName: string | Expression<string>;
	/**
	 * A valid JSON object with properties required for this Credential Type. To see the expected format, you can use 'Get Schema' operation.
	 * @displayOptions.show { resource: ["credential"], operation: ["create"] }
	 */
	data: IDataObject | string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1CredentialDeleteConfig = {
	resource: 'credential';
	operation: 'delete';
	credentialId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1CredentialGetSchemaConfig = {
	resource: 'credential';
	operation: 'getSchema';
	/**
	 * The available types depend on nodes installed on the n8n instance. Some built-in types include e.g. 'githubApi', 'notionApi', and 'slackApi'.
	 * @displayOptions.show { resource: ["credential"], operation: ["getSchema"] }
	 */
	credentialTypeName: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1ExecutionGetConfig = {
	resource: 'execution';
	operation: 'get';
	executionId: string | Expression<string>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1ExecutionGetAllConfig = {
	resource: 'execution';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["execution"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["execution"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1ExecutionDeleteConfig = {
	resource: 'execution';
	operation: 'delete';
	executionId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowActivateConfig = {
	resource: 'workflow';
	operation: 'activate';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["activate"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowCreateConfig = {
	resource: 'workflow';
	operation: 'create';
	/**
	 * A valid JSON object with required fields: 'name', 'nodes', 'connections' and 'settings'. More information can be found in the &lt;a href="https://docs.n8n.io/api/api-reference/#tag/workflow/paths/~1workflows/post"&gt;documentation&lt;/a&gt;.
	 * @displayOptions.show { resource: ["workflow"], operation: ["create"] }
	 * @default { "name": "My workflow", "nodes": [], "connections": {}, "settings": {} }
	 */
	workflowObject: IDataObject | string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowDeactivateConfig = {
	resource: 'workflow';
	operation: 'deactivate';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["deactivate"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowDeleteConfig = {
	resource: 'workflow';
	operation: 'delete';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["delete"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowGetConfig = {
	resource: 'workflow';
	operation: 'get';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["get"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowGetAllConfig = {
	resource: 'workflow';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["workflow"], operation: ["getAll"] }
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["workflow"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowGetVersionConfig = {
	resource: 'workflow';
	operation: 'getVersion';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["getVersion"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	/**
	 * The version ID to retrieve
	 * @displayOptions.show { resource: ["workflow"], operation: ["getVersion"] }
	 */
	versionId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1WorkflowUpdateConfig = {
	resource: 'workflow';
	operation: 'update';
	/**
	 * Workflow to filter the executions by
	 * @displayOptions.show { resource: ["workflow"], operation: ["update"] }
	 * @default {"mode":"list","value":""}
	 */
	workflowId: ResourceLocatorValue;
	/**
	 * A valid JSON object with required fields: 'name', 'nodes', 'connections' and 'settings'. More information can be found in the &lt;a href="https://docs.n8n.io/api/api-reference/#tag/workflow/paths/~1workflows~1%7bid%7d/put"&gt;documentation&lt;/a&gt;.
	 * @displayOptions.show { resource: ["workflow"], operation: ["update"] }
	 */
	workflowObject: IDataObject | string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type N8nV1Params =
	| N8nV1AuditGenerateConfig
	| N8nV1CredentialCreateConfig
	| N8nV1CredentialDeleteConfig
	| N8nV1CredentialGetSchemaConfig
	| N8nV1ExecutionGetConfig
	| N8nV1ExecutionGetAllConfig
	| N8nV1ExecutionDeleteConfig
	| N8nV1WorkflowActivateConfig
	| N8nV1WorkflowCreateConfig
	| N8nV1WorkflowDeactivateConfig
	| N8nV1WorkflowDeleteConfig
	| N8nV1WorkflowGetConfig
	| N8nV1WorkflowGetAllConfig
	| N8nV1WorkflowGetVersionConfig
	| N8nV1WorkflowUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface N8nV1Credentials {
	n8nApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type N8nV1Node = {
	type: 'n8n-nodes-base.n8n';
	version: 1;
	config: NodeConfig<N8nV1Params>;
	credentials?: N8nV1Credentials;
};

export type N8nNode = N8nV1Node;
