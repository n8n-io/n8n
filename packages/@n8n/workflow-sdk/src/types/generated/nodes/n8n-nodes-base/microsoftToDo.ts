/**
 * Microsoft To Do Node Types
 *
 * Consume Microsoft To Do API.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsofttodo/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MicrosoftToDoV1LinkedResourceCreateConfig = {
	resource: 'linkedResource';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	/**
	 * Field indicating title of the linked entity
	 */
	displayName?: string | Expression<string>;
	/**
	 * App name of the source that is sending the linked entity
	 */
	applicationName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1LinkedResourceDeleteConfig = {
	resource: 'linkedResource';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type MicrosoftToDoV1LinkedResourceUpdateConfig = {
	resource: 'linkedResource';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	displayName: string | Expression<string>;
};

export type MicrosoftToDoV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
	/**
	 * The identifier of the list, unique in the user's mailbox
	 */
	listId: string | Expression<string>;
};

export type MicrosoftToDoV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
	/**
	 * The identifier of the list, unique in the user's mailbox
	 */
	listId: string | Expression<string>;
};

export type MicrosoftToDoV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type MicrosoftToDoV1ListUpdateConfig = {
	resource: 'list';
	operation: 'update';
	/**
	 * The identifier of the list, unique in the user's mailbox
	 */
	listId: string | Expression<string>;
	/**
	 * List display name
	 */
	displayName: string | Expression<string>;
};

export type MicrosoftToDoV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	taskListId: string | Expression<string>;
	/**
	 * A brief description of the task
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftToDoV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
};

export type MicrosoftToDoV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	taskListId: string | Expression<string>;
	taskId: string | Expression<string>;
};

export type MicrosoftToDoV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	taskListId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type MicrosoftToDoV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * The identifier of the list, unique in the user's mailbox. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	| MicrosoftToDoV1TaskUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftToDoV1Credentials {
	microsoftToDoOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftToDoV1Node = {
	type: 'n8n-nodes-base.microsoftToDo';
	version: 1;
	config: NodeConfig<MicrosoftToDoV1Params>;
	credentials?: MicrosoftToDoV1Credentials;
};

export type MicrosoftToDoNode = MicrosoftToDoV1Node;
