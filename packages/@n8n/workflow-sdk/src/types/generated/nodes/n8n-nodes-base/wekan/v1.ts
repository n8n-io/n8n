/**
 * Wekan Node - Version 1
 * Consume Wekan API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new board */
export type WekanV1BoardCreateConfig = {
	resource: 'board';
	operation: 'create';
/**
 * The title of the board
 * @displayOptions.show { operation: ["create"], resource: ["board"] }
 */
		title: string | Expression<string>;
/**
 * The user ID in Wekan. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["board"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["board"] }
 */
		boardId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1BoardGetConfig = {
	resource: 'board';
	operation: 'get';
/**
 * The ID of the board to get
 * @displayOptions.show { operation: ["get"], resource: ["board"] }
 */
		boardId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1BoardGetAllConfig = {
	resource: 'board';
	operation: 'getAll';
/**
 * The ID of the user that boards are attached. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["board"] }
 */
		IdUser: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["board"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["board"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list to create card in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The title of the card
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		title: string | Expression<string>;
/**
 * The swimlane ID of the new card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		swimlaneId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["card"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["card"] }
 */
		cardId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1CardGetConfig = {
	resource: 'card';
	operation: 'get';
/**
 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["card"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card to get
 * @displayOptions.show { operation: ["get"], resource: ["card"] }
 */
		cardId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1CardGetAllConfig = {
	resource: 'card';
	operation: 'getAll';
/**
 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["card"] }
 */
		boardId: string | Expression<string>;
	fromObject: 'list' | 'swimlane' | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { fromObject: ["list"], operation: ["getAll"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the swimlane that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { fromObject: ["swimlane"], operation: ["getAll"], resource: ["card"] }
 */
		swimlaneId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["card"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["card"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["card"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["card"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		cardId: string | Expression<string>;
/**
 * The user who posted the comment. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		authorId: string | Expression<string>;
/**
 * The comment text
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		comment: string | Expression<string>;
};

/** Delete a board */
export type WekanV1CardCommentDeleteConfig = {
	resource: 'cardComment';
	operation: 'delete';
/**
 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["cardComment"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["cardComment"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["cardComment"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the comment to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["cardComment"] }
 */
		commentId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1CardCommentGetConfig = {
	resource: 'cardComment';
	operation: 'get';
/**
 * The ID of the board that card belongs to
 * @displayOptions.show { operation: ["get"], resource: ["cardComment"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["cardComment"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["cardComment"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the comment to get
 * @displayOptions.show { operation: ["get"], resource: ["cardComment"] }
 */
		commentId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1CardCommentGetAllConfig = {
	resource: 'cardComment';
	operation: 'getAll';
/**
 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["cardComment"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["cardComment"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["cardComment"] }
 */
		cardId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["cardComment"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["cardComment"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card to add checklist to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
 */
		cardId: string | Expression<string>;
/**
 * The title of the checklist to add
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
 */
		title: string | Expression<string>;
/**
 * Items to be added to the checklist
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["checklist"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklist"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card that checklist belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklist"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the checklist to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklist"] }
 */
		checklistId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ChecklistGetConfig = {
	resource: 'checklist';
	operation: 'get';
/**
 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklist"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklist"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card that checklist belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklist"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the checklist to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklist"] }
 */
		checklistId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1ChecklistGetAllConfig = {
	resource: 'checklist';
	operation: 'getAll';
/**
 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["checklist"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["checklist"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card to get checklists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["checklist"] }
 */
		cardId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["checklist"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["checklist"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["checklistItem"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklistItem"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklistItem"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklistItem"] }
 */
		checklistId: string | Expression<string>;
/**
 * The ID of the checklistItem item to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["checklistItem"] }
 */
		checklistItemId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ChecklistItemGetConfig = {
	resource: 'checklistItem';
	operation: 'get';
/**
 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklistItem"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklistItem"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklistItem"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the checklistItem that card belongs to
 * @displayOptions.show { operation: ["get"], resource: ["checklistItem"] }
 */
		checklistId: string | Expression<string>;
/**
 * The ID of the checklistItem item to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["checklistItem"] }
 */
		checklistItemId: string | Expression<string>;
};

/** Update a card */
export type WekanV1ChecklistItemUpdateConfig = {
	resource: 'checklistItem';
	operation: 'update';
/**
 * The ID of the board that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["checklistItem"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["checklistItem"] }
 */
		listId: string | Expression<string>;
/**
 * The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["checklistItem"] }
 */
		cardId: string | Expression<string>;
/**
 * The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["checklistItem"] }
 */
		checklistId: string | Expression<string>;
/**
 * The ID of the checklistItem item to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["checklistItem"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		boardId: string | Expression<string>;
/**
 * The title of the list
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		title: string | Expression<string>;
};

/** Delete a board */
export type WekanV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
/**
 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["list"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["delete"], resource: ["list"] }
 */
		listId: string | Expression<string>;
};

/** Get the data of a board */
export type WekanV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * The ID of the board that list belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["list"] }
 */
		boardId: string | Expression<string>;
/**
 * The ID of the list to get
 * @displayOptions.show { operation: ["get"], resource: ["list"] }
 */
		listId: string | Expression<string>;
};

/** Get many user boards */
export type WekanV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * ID of the board where the lists are in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 */
		boardId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["list"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface WekanV1Credentials {
	wekanApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WekanV1NodeBase {
	type: 'n8n-nodes-base.wekan';
	version: 1;
	credentials?: WekanV1Credentials;
}

export type WekanV1BoardCreateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1BoardCreateConfig>;
};

export type WekanV1BoardDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1BoardDeleteConfig>;
};

export type WekanV1BoardGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1BoardGetConfig>;
};

export type WekanV1BoardGetAllNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1BoardGetAllConfig>;
};

export type WekanV1CardCreateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardCreateConfig>;
};

export type WekanV1CardDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardDeleteConfig>;
};

export type WekanV1CardGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardGetConfig>;
};

export type WekanV1CardGetAllNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardGetAllConfig>;
};

export type WekanV1CardUpdateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardUpdateConfig>;
};

export type WekanV1CardCommentCreateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardCommentCreateConfig>;
};

export type WekanV1CardCommentDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardCommentDeleteConfig>;
};

export type WekanV1CardCommentGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardCommentGetConfig>;
};

export type WekanV1CardCommentGetAllNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1CardCommentGetAllConfig>;
};

export type WekanV1ChecklistCreateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistCreateConfig>;
};

export type WekanV1ChecklistDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistDeleteConfig>;
};

export type WekanV1ChecklistGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistGetConfig>;
};

export type WekanV1ChecklistGetAllNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistGetAllConfig>;
};

export type WekanV1ChecklistItemDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistItemDeleteConfig>;
};

export type WekanV1ChecklistItemGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistItemGetConfig>;
};

export type WekanV1ChecklistItemUpdateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ChecklistItemUpdateConfig>;
};

export type WekanV1ListCreateNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ListCreateConfig>;
};

export type WekanV1ListDeleteNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ListDeleteConfig>;
};

export type WekanV1ListGetNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ListGetConfig>;
};

export type WekanV1ListGetAllNode = WekanV1NodeBase & {
	config: NodeConfig<WekanV1ListGetAllConfig>;
};

export type WekanV1Node =
	| WekanV1BoardCreateNode
	| WekanV1BoardDeleteNode
	| WekanV1BoardGetNode
	| WekanV1BoardGetAllNode
	| WekanV1CardCreateNode
	| WekanV1CardDeleteNode
	| WekanV1CardGetNode
	| WekanV1CardGetAllNode
	| WekanV1CardUpdateNode
	| WekanV1CardCommentCreateNode
	| WekanV1CardCommentDeleteNode
	| WekanV1CardCommentGetNode
	| WekanV1CardCommentGetAllNode
	| WekanV1ChecklistCreateNode
	| WekanV1ChecklistDeleteNode
	| WekanV1ChecklistGetNode
	| WekanV1ChecklistGetAllNode
	| WekanV1ChecklistItemDeleteNode
	| WekanV1ChecklistItemGetNode
	| WekanV1ChecklistItemUpdateNode
	| WekanV1ListCreateNode
	| WekanV1ListDeleteNode
	| WekanV1ListGetNode
	| WekanV1ListGetAllNode
	;