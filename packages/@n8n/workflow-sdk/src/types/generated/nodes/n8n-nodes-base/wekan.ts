/**
 * Wekan Node Types
 *
 * Consume Wekan API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wekan/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new board */
export type WekanV1BoardCreateConfig = {
	resource: 'board';
	operation: 'create';
	/**
	 * The title of the board
	 */
	title: string | Expression<string>;
	/**
	 * The user ID in Wekan. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	owner: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a board */
export type WekanV1BoardDeleteConfig = {
	resource: 'board';
	operation: 'delete';
	/**
	 * The ID of the board to delete
	 */
	boardId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1BoardGetConfig = {
	resource: 'board';
	operation: 'get';
	/**
	 * The ID of the board to get
	 */
	boardId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1BoardGetAllConfig = {
	resource: 'board';
	operation: 'getAll';
	/**
	 * The ID of the user that boards are attached. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	IdUser: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a new board */
export type WekanV1CardCreateConfig = {
	resource: 'card';
	operation: 'create';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list to create card in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The title of the card
	 */
	title: string | Expression<string>;
	/**
	 * The swimlane ID of the new card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	swimlaneId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	authorId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a board */
export type WekanV1CardDeleteConfig = {
	resource: 'card';
	operation: 'delete';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1CardGetConfig = {
	resource: 'card';
	operation: 'get';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card to get
	 */
	cardId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1CardGetAllConfig = {
	resource: 'card';
	operation: 'getAll';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	fromObject: 'list' | 'swimlane' | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the swimlane that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	swimlaneId?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Update a card */
export type WekanV1CardUpdateConfig = {
	resource: 'card';
	operation: 'update';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new board */
export type WekanV1CardCommentCreateConfig = {
	resource: 'cardComment';
	operation: 'create';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The user who posted the comment. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	authorId: string | Expression<string>;
	/**
	 * The comment text
	 */
	comment: string | Expression<string>;
};

/** Delete a board */
export type WekanV1CardCommentDeleteConfig = {
	resource: 'cardComment';
	operation: 'delete';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the comment to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	commentId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1CardCommentGetConfig = {
	resource: 'cardComment';
	operation: 'get';
	/**
	 * The ID of the board that card belongs to
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the comment to get
	 */
	commentId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1CardCommentGetAllConfig = {
	resource: 'cardComment';
	operation: 'getAll';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a new board */
export type WekanV1ChecklistCreateConfig = {
	resource: 'checklist';
	operation: 'create';
	/**
	 * The ID of the board where the card is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card to add checklist to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The title of the checklist to add
	 */
	title: string | Expression<string>;
	/**
	 * Items to be added to the checklist
	 * @default []
	 */
	items?: string | Expression<string>;
};

/** Delete a board */
export type WekanV1ChecklistDeleteConfig = {
	resource: 'checklist';
	operation: 'delete';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card that checklist belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the checklist to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ChecklistGetConfig = {
	resource: 'checklist';
	operation: 'get';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card that checklist belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the checklist to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1ChecklistGetAllConfig = {
	resource: 'checklist';
	operation: 'getAll';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card to get checklists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Delete a board */
export type WekanV1ChecklistItemDeleteConfig = {
	resource: 'checklistItem';
	operation: 'delete';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistId: string | Expression<string>;
	/**
	 * The ID of the checklistItem item to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistItemId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ChecklistItemGetConfig = {
	resource: 'checklistItem';
	operation: 'get';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the checklistItem that card belongs to
	 */
	checklistId: string | Expression<string>;
	/**
	 * The ID of the checklistItem item to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistItemId: string | Expression<string>;
};

/** Update a card */
export type WekanV1ChecklistItemUpdateConfig = {
	resource: 'checklistItem';
	operation: 'update';
	/**
	 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	cardId: string | Expression<string>;
	/**
	 * The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistId: string | Expression<string>;
	/**
	 * The ID of the checklistItem item to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	checklistItemId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new board */
export type WekanV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
	/**
	 * The ID of the board the list should be created in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The title of the list
	 */
	title: string | Expression<string>;
};

/** Delete a board */
export type WekanV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
	/**
	 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The ID of the list to get
	 */
	listId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
	/**
	 * ID of the board where the lists are in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type WekanV1Params =
	| WekanV1BoardCreateConfig
	| WekanV1BoardDeleteConfig
	| WekanV1BoardGetConfig
	| WekanV1BoardGetAllConfig
	| WekanV1CardCreateConfig
	| WekanV1CardDeleteConfig
	| WekanV1CardGetConfig
	| WekanV1CardGetAllConfig
	| WekanV1CardUpdateConfig
	| WekanV1CardCommentCreateConfig
	| WekanV1CardCommentDeleteConfig
	| WekanV1CardCommentGetConfig
	| WekanV1CardCommentGetAllConfig
	| WekanV1ChecklistCreateConfig
	| WekanV1ChecklistDeleteConfig
	| WekanV1ChecklistGetConfig
	| WekanV1ChecklistGetAllConfig
	| WekanV1ChecklistItemDeleteConfig
	| WekanV1ChecklistItemGetConfig
	| WekanV1ChecklistItemUpdateConfig
	| WekanV1ListCreateConfig
	| WekanV1ListDeleteConfig
	| WekanV1ListGetConfig
	| WekanV1ListGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WekanV1Credentials {
	wekanApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WekanNode = {
	type: 'n8n-nodes-base.wekan';
	version: 1;
	config: NodeConfig<WekanV1Params>;
	credentials?: WekanV1Credentials;
};
