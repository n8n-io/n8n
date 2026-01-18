/**
 * Trello Node - Version 1
 * Create, change and delete boards and cards
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new attachment for a card */
export type TrelloV1AttachmentCreateConfig = {
	resource: 'attachment';
	operation: 'create';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "get", "getAll"], resource: ["attachment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The URL of the attachment to add
 * @displayOptions.show { operation: ["create"], resource: ["attachment"] }
 */
		url: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type TrelloV1AttachmentDeleteConfig = {
	resource: 'attachment';
	operation: 'delete';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "get", "getAll"], resource: ["attachment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the attachment to delete
 * @displayOptions.show { operation: ["delete"], resource: ["attachment"] }
 */
		id: string | Expression<string>;
};

/** Get the data of an attachment */
export type TrelloV1AttachmentGetConfig = {
	resource: 'attachment';
	operation: 'get';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "get", "getAll"], resource: ["attachment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the attachment to get
 * @displayOptions.show { operation: ["get"], resource: ["attachment"] }
 */
		id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Returns many attachments for the card */
export type TrelloV1AttachmentGetAllConfig = {
	resource: 'attachment';
	operation: 'getAll';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "get", "getAll"], resource: ["attachment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Create a new attachment for a card */
export type TrelloV1BoardCreateConfig = {
	resource: 'board';
	operation: 'create';
/**
 * The name of the board
 * @displayOptions.show { operation: ["create"], resource: ["board"] }
 */
		name: string | Expression<string>;
/**
 * The description of the board
 * @displayOptions.show { operation: ["create"], resource: ["board"] }
 */
		description?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type TrelloV1BoardDeleteConfig = {
	resource: 'board';
	operation: 'delete';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["board"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
};

/** Get the data of an attachment */
export type TrelloV1BoardGetConfig = {
	resource: 'board';
	operation: 'get';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["board"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Update a board */
export type TrelloV1BoardUpdateConfig = {
	resource: 'board';
	operation: 'update';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["board"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Add member to board using member ID */
export type TrelloV1BoardMemberAddConfig = {
	resource: 'boardMember';
	operation: 'add';
/**
 * The ID of the board to add member to
 * @displayOptions.show { operation: ["add"], resource: ["boardMember"] }
 */
		id: string | Expression<string>;
/**
 * The ID of the member to add to the board
 * @displayOptions.show { operation: ["add"], resource: ["boardMember"] }
 */
		idMember: string | Expression<string>;
/**
 * Determines the type of membership the user being added should have
 * @displayOptions.show { operation: ["add"], resource: ["boardMember"] }
 * @default normal
 */
		type: 'normal' | 'admin' | 'observer' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Returns many attachments for the card */
export type TrelloV1BoardMemberGetAllConfig = {
	resource: 'boardMember';
	operation: 'getAll';
/**
 * The ID of the board to get members from
 * @displayOptions.show { operation: ["getAll"], resource: ["boardMember"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["boardMember"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["boardMember"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
};

/** Invite a new member to a board via email */
export type TrelloV1BoardMemberInviteConfig = {
	resource: 'boardMember';
	operation: 'invite';
/**
 * The ID of the board to invite member to
 * @displayOptions.show { operation: ["invite"], resource: ["boardMember"] }
 */
		id: string | Expression<string>;
/**
 * The ID of the board to update
 * @displayOptions.show { operation: ["invite"], resource: ["boardMember"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Remove member from board using member ID */
export type TrelloV1BoardMemberRemoveConfig = {
	resource: 'boardMember';
	operation: 'remove';
/**
 * The ID of the board to remove member from
 * @displayOptions.show { operation: ["remove"], resource: ["boardMember"] }
 */
		id: string | Expression<string>;
/**
 * The ID of the member to remove from the board
 * @displayOptions.show { operation: ["remove"], resource: ["boardMember"] }
 */
		idMember: string | Expression<string>;
};

/** Create a new attachment for a card */
export type TrelloV1CardCreateConfig = {
	resource: 'card';
	operation: 'create';
/**
 * The ID of the list to create card in
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		listId: string | Expression<string>;
/**
 * The name of the card
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		name: string | Expression<string>;
/**
 * The description of the card
 * @displayOptions.show { operation: ["create"], resource: ["card"] }
 */
		description?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type TrelloV1CardDeleteConfig = {
	resource: 'card';
	operation: 'delete';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["card"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
};

/** Get the data of an attachment */
export type TrelloV1CardGetConfig = {
	resource: 'card';
	operation: 'get';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["card"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Update a board */
export type TrelloV1CardUpdateConfig = {
	resource: 'card';
	operation: 'update';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["get", "delete", "update"], resource: ["card"] }
 * @default {"mode":"list","value":""}
 */
		id: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new attachment for a card */
export type TrelloV1CardCommentCreateConfig = {
	resource: 'cardComment';
	operation: 'create';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["update", "delete", "create"], resource: ["cardComment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * Text of the comment
 * @displayOptions.show { operation: ["create"], resource: ["cardComment"] }
 */
		text: string | Expression<string>;
};

/** Delete an attachment */
export type TrelloV1CardCommentDeleteConfig = {
	resource: 'cardComment';
	operation: 'delete';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["update", "delete", "create"], resource: ["cardComment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the comment to delete
 * @displayOptions.show { operation: ["delete"], resource: ["cardComment"] }
 */
		commentId: string | Expression<string>;
};

/** Update a board */
export type TrelloV1CardCommentUpdateConfig = {
	resource: 'cardComment';
	operation: 'update';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["update", "delete", "create"], resource: ["cardComment"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the comment to delete
 * @displayOptions.show { operation: ["update"], resource: ["cardComment"] }
 */
		commentId: string | Expression<string>;
/**
 * Text of the comment
 * @displayOptions.show { operation: ["update"], resource: ["cardComment"] }
 */
		text: string | Expression<string>;
};

/** Create a new attachment for a card */
export type TrelloV1ChecklistCreateConfig = {
	resource: 'checklist';
	operation: 'create';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The URL of the checklist to add
 * @displayOptions.show { operation: ["create"], resource: ["checklist"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a checklist item */
export type TrelloV1ChecklistCreateCheckItemConfig = {
	resource: 'checklist';
	operation: 'createCheckItem';
/**
 * The ID of the checklist to update
 * @displayOptions.show { operation: ["createCheckItem"], resource: ["checklist"] }
 */
		checklistId: string | Expression<string>;
/**
 * The name of the new check item on the checklist
 * @displayOptions.show { operation: ["createCheckItem"], resource: ["checklist"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type TrelloV1ChecklistDeleteConfig = {
	resource: 'checklist';
	operation: 'delete';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the checklist to delete
 * @displayOptions.show { operation: ["delete"], resource: ["checklist"] }
 */
		id: string | Expression<string>;
};

/** Delete a checklist item */
export type TrelloV1ChecklistDeleteCheckItemConfig = {
	resource: 'checklist';
	operation: 'deleteCheckItem';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the checklist item to delete
 * @displayOptions.show { operation: ["deleteCheckItem"], resource: ["checklist"] }
 */
		checkItemId: string | Expression<string>;
};

/** Get the data of an attachment */
export type TrelloV1ChecklistGetConfig = {
	resource: 'checklist';
	operation: 'get';
/**
 * The ID of the checklist to get
 * @displayOptions.show { operation: ["get"], resource: ["checklist"] }
 */
		id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a specific checklist on a card */
export type TrelloV1ChecklistGetCheckItemConfig = {
	resource: 'checklist';
	operation: 'getCheckItem';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the checklist item to get
 * @displayOptions.show { operation: ["getCheckItem"], resource: ["checklist"] }
 */
		checkItemId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the completed checklist items on a card */
export type TrelloV1ChecklistCompletedCheckItemsConfig = {
	resource: 'checklist';
	operation: 'completedCheckItems';
	additionalFields?: Record<string, unknown>;
};

/** Returns many attachments for the card */
export type TrelloV1ChecklistGetAllConfig = {
	resource: 'checklist';
	operation: 'getAll';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Update an item in a checklist on a card */
export type TrelloV1ChecklistUpdateCheckItemConfig = {
	resource: 'checklist';
	operation: 'updateCheckItem';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["delete", "create", "getAll", "deleteCheckItem", "getCheckItem", "updateCheckItem", "completeCheckItems"], resource: ["checklist"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the checklist item to update
 * @displayOptions.show { operation: ["updateCheckItem"], resource: ["checklist"] }
 */
		checkItemId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a label to a card */
export type TrelloV1LabelAddLabelConfig = {
	resource: 'label';
	operation: 'addLabel';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["addLabel", "removeLabel"], resource: ["label"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the label to add
 * @displayOptions.show { operation: ["addLabel"], resource: ["label"] }
 */
		id: string | Expression<string>;
};

/** Create a new attachment for a card */
export type TrelloV1LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["create", "getAll"], resource: ["label"] }
 * @default {"mode":"list","value":""}
 */
		boardId: ResourceLocatorValue;
/**
 * Name for the label
 * @displayOptions.show { operation: ["create"], resource: ["label"] }
 */
		name: string | Expression<string>;
/**
 * The color for the label
 * @displayOptions.show { operation: ["create"], resource: ["label"] }
 * @default null
 */
		color: 'black' | 'blue' | 'green' | 'lime' | 'null' | 'orange' | 'pink' | 'purple' | 'red' | 'sky' | 'yellow' | Expression<string>;
};

/** Delete an attachment */
export type TrelloV1LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
/**
 * The ID of the label to delete
 * @displayOptions.show { operation: ["delete"], resource: ["label"] }
 */
		id: string | Expression<string>;
};

/** Get the data of an attachment */
export type TrelloV1LabelGetConfig = {
	resource: 'label';
	operation: 'get';
/**
 * Get information about a label by ID
 * @displayOptions.show { operation: ["get"], resource: ["label"] }
 */
		id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Returns many attachments for the card */
export type TrelloV1LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["create", "getAll"], resource: ["label"] }
 * @default {"mode":"list","value":""}
 */
		boardId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Remove a label from a card */
export type TrelloV1LabelRemoveLabelConfig = {
	resource: 'label';
	operation: 'removeLabel';
/**
 * The ID of the card
 * @displayOptions.show { operation: ["addLabel", "removeLabel"], resource: ["label"] }
 * @default {"mode":"list","value":""}
 */
		cardId: ResourceLocatorValue;
/**
 * The ID of the label to remove
 * @displayOptions.show { operation: ["removeLabel"], resource: ["label"] }
 */
		id: string | Expression<string>;
};

/** Update a board */
export type TrelloV1LabelUpdateConfig = {
	resource: 'label';
	operation: 'update';
/**
 * The ID of the label to update
 * @displayOptions.show { operation: ["update"], resource: ["label"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Archive/Unarchive a list */
export type TrelloV1ListArchiveConfig = {
	resource: 'list';
	operation: 'archive';
/**
 * The ID of the list to archive or unarchive
 * @displayOptions.show { operation: ["archive"], resource: ["list"] }
 */
		id: string | Expression<string>;
/**
 * Whether the list should be archived or unarchived
 * @displayOptions.show { operation: ["archive"], resource: ["list"] }
 * @default false
 */
		archive?: boolean | Expression<boolean>;
};

/** Create a new attachment for a card */
export type TrelloV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * The ID of the board the list should be created in
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		idBoard: string | Expression<string>;
/**
 * The name of the list
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get the data of an attachment */
export type TrelloV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * The ID of the list to get
 * @displayOptions.show { operation: ["get"], resource: ["list"] }
 */
		id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get all the cards in a list */
export type TrelloV1ListGetCardsConfig = {
	resource: 'list';
	operation: 'getCards';
/**
 * The ID of the list to get cards
 * @displayOptions.show { operation: ["getCards"], resource: ["list"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["getCards"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getCards"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Returns many attachments for the card */
export type TrelloV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * The ID of the board
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a board */
export type TrelloV1ListUpdateConfig = {
	resource: 'list';
	operation: 'update';
/**
 * The ID of the list to update
 * @displayOptions.show { operation: ["update"], resource: ["list"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type TrelloV1Params =
	| TrelloV1AttachmentCreateConfig
	| TrelloV1AttachmentDeleteConfig
	| TrelloV1AttachmentGetConfig
	| TrelloV1AttachmentGetAllConfig
	| TrelloV1BoardCreateConfig
	| TrelloV1BoardDeleteConfig
	| TrelloV1BoardGetConfig
	| TrelloV1BoardUpdateConfig
	| TrelloV1BoardMemberAddConfig
	| TrelloV1BoardMemberGetAllConfig
	| TrelloV1BoardMemberInviteConfig
	| TrelloV1BoardMemberRemoveConfig
	| TrelloV1CardCreateConfig
	| TrelloV1CardDeleteConfig
	| TrelloV1CardGetConfig
	| TrelloV1CardUpdateConfig
	| TrelloV1CardCommentCreateConfig
	| TrelloV1CardCommentDeleteConfig
	| TrelloV1CardCommentUpdateConfig
	| TrelloV1ChecklistCreateConfig
	| TrelloV1ChecklistCreateCheckItemConfig
	| TrelloV1ChecklistDeleteConfig
	| TrelloV1ChecklistDeleteCheckItemConfig
	| TrelloV1ChecklistGetConfig
	| TrelloV1ChecklistGetCheckItemConfig
	| TrelloV1ChecklistCompletedCheckItemsConfig
	| TrelloV1ChecklistGetAllConfig
	| TrelloV1ChecklistUpdateCheckItemConfig
	| TrelloV1LabelAddLabelConfig
	| TrelloV1LabelCreateConfig
	| TrelloV1LabelDeleteConfig
	| TrelloV1LabelGetConfig
	| TrelloV1LabelGetAllConfig
	| TrelloV1LabelRemoveLabelConfig
	| TrelloV1LabelUpdateConfig
	| TrelloV1ListArchiveConfig
	| TrelloV1ListCreateConfig
	| TrelloV1ListGetConfig
	| TrelloV1ListGetCardsConfig
	| TrelloV1ListGetAllConfig
	| TrelloV1ListUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TrelloV1Credentials {
	trelloApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TrelloV1Node = {
	type: 'n8n-nodes-base.trello';
	version: 1;
	config: NodeConfig<TrelloV1Params>;
	credentials?: TrelloV1Credentials;
};