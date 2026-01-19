/**
 * Microsoft To Do Node - Version 1
 * Consume Microsoft To Do API.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MicrosoftToDoV1LinkedResourceCreateConfig = {
	resource: 'linkedResource';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "delete", "get", "getAll", "update"], resource: ["linkedResource"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
/**
 * Field indicating title of the linked entity
 * @displayOptions.show { operation: ["create"], resource: ["linkedResource"] }
 */
		displayName?: string | Expression<string>;
/**
 * App name of the source that is sending the linked entity
 * @displayOptions.show { operation: ["create"], resource: ["linkedResource"] }
 */
		applicationName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1LinkedResourceDeleteConfig = {
	resource: 'linkedResource';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "delete", "get", "getAll", "update"], resource: ["linkedResource"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	linkedResourceId: string | Expression<string>;
};

export type MicrosoftToDoV1LinkedResourceGetConfig = {
	resource: 'linkedResource';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "delete", "get", "getAll", "update"], resource: ["linkedResource"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	linkedResourceId: string | Expression<string>;
};

export type MicrosoftToDoV1LinkedResourceGetAllConfig = {
	resource: 'linkedResource';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "delete", "get", "getAll", "update"], resource: ["linkedResource"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["linkedResource"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["linkedResource"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MicrosoftToDoV1LinkedResourceUpdateConfig = {
	resource: 'linkedResource';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "delete", "get", "getAll", "update"], resource: ["linkedResource"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	linkedResourceId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * List display name
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		displayName: string | Expression<string>;
};

export type MicrosoftToDoV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
/**
 * The identifier of the list, unique in the user's mailbox
 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["list"] }
 */
		listId: string | Expression<string>;
};

export type MicrosoftToDoV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * The identifier of the list, unique in the user's mailbox
 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["list"] }
 */
		listId: string | Expression<string>;
};

export type MicrosoftToDoV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MicrosoftToDoV1ListUpdateConfig = {
	resource: 'list';
	operation: 'update';
/**
 * The identifier of the list, unique in the user's mailbox
 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["list"] }
 */
		listId: string | Expression<string>;
/**
 * List display name
 * @displayOptions.show { operation: ["update"], resource: ["list"] }
 */
		displayName: string | Expression<string>;
};

export type MicrosoftToDoV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		taskListId: string | Expression<string>;
/**
 * A brief description of the task
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete", "get", "getAll", "update"], resource: ["task"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
};

export type MicrosoftToDoV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete", "get", "getAll", "update"], resource: ["task"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
};

export type MicrosoftToDoV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete", "get", "getAll", "update"], resource: ["task"] }
 */
		taskListId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MicrosoftToDoV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete", "get", "getAll", "update"], resource: ["task"] }
 */
		taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1Params =
	| MicrosoftToDoV1LinkedResourceCreateConfig
	| MicrosoftToDoV1LinkedResourceDeleteConfig
	| MicrosoftToDoV1LinkedResourceGetConfig
	| MicrosoftToDoV1LinkedResourceGetAllConfig
	| MicrosoftToDoV1LinkedResourceUpdateConfig
	| MicrosoftToDoV1ListCreateConfig
	| MicrosoftToDoV1ListDeleteConfig
	| MicrosoftToDoV1ListGetConfig
	| MicrosoftToDoV1ListGetAllConfig
	| MicrosoftToDoV1ListUpdateConfig
	| MicrosoftToDoV1TaskCreateConfig
	| MicrosoftToDoV1TaskDeleteConfig
	| MicrosoftToDoV1TaskGetConfig
	| MicrosoftToDoV1TaskGetAllConfig
	| MicrosoftToDoV1TaskUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftToDoV1Credentials {
	microsoftToDoOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftToDoV1NodeBase {
	type: 'n8n-nodes-base.microsoftToDo';
	version: 1;
	credentials?: MicrosoftToDoV1Credentials;
}

export type MicrosoftToDoV1LinkedResourceCreateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1LinkedResourceCreateConfig>;
};

export type MicrosoftToDoV1LinkedResourceDeleteNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1LinkedResourceDeleteConfig>;
};

export type MicrosoftToDoV1LinkedResourceGetNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1LinkedResourceGetConfig>;
};

export type MicrosoftToDoV1LinkedResourceGetAllNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1LinkedResourceGetAllConfig>;
};

export type MicrosoftToDoV1LinkedResourceUpdateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1LinkedResourceUpdateConfig>;
};

export type MicrosoftToDoV1ListCreateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1ListCreateConfig>;
};

export type MicrosoftToDoV1ListDeleteNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1ListDeleteConfig>;
};

export type MicrosoftToDoV1ListGetNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1ListGetConfig>;
};

export type MicrosoftToDoV1ListGetAllNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1ListGetAllConfig>;
};

export type MicrosoftToDoV1ListUpdateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1ListUpdateConfig>;
};

export type MicrosoftToDoV1TaskCreateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1TaskCreateConfig>;
};

export type MicrosoftToDoV1TaskDeleteNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1TaskDeleteConfig>;
};

export type MicrosoftToDoV1TaskGetNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1TaskGetConfig>;
};

export type MicrosoftToDoV1TaskGetAllNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1TaskGetAllConfig>;
};

export type MicrosoftToDoV1TaskUpdateNode = MicrosoftToDoV1NodeBase & {
	config: NodeConfig<MicrosoftToDoV1TaskUpdateConfig>;
};

export type MicrosoftToDoV1Node =
	| MicrosoftToDoV1LinkedResourceCreateNode
	| MicrosoftToDoV1LinkedResourceDeleteNode
	| MicrosoftToDoV1LinkedResourceGetNode
	| MicrosoftToDoV1LinkedResourceGetAllNode
	| MicrosoftToDoV1LinkedResourceUpdateNode
	| MicrosoftToDoV1ListCreateNode
	| MicrosoftToDoV1ListDeleteNode
	| MicrosoftToDoV1ListGetNode
	| MicrosoftToDoV1ListGetAllNode
	| MicrosoftToDoV1ListUpdateNode
	| MicrosoftToDoV1TaskCreateNode
	| MicrosoftToDoV1TaskDeleteNode
	| MicrosoftToDoV1TaskGetNode
	| MicrosoftToDoV1TaskGetAllNode
	| MicrosoftToDoV1TaskUpdateNode
	;