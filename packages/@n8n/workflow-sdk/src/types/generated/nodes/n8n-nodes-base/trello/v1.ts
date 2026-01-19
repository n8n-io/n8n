/**
 * Trello Node - Version 1
 * Create, change and delete boards and cards
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
// Output Types
// ===========================================================================

export type TrelloV1AttachmentCreateOutput = {
	date?: string;
	id?: string;
	idMember?: string;
	isMalicious?: boolean;
	isUpload?: boolean;
	mimeType?: string;
	name?: string;
	pos?: number;
	previews?: Array<{
		_id?: string;
		bytes?: number;
		height?: number;
		id?: string;
		scaled?: boolean;
		url?: string;
		width?: number;
	}>;
	url?: string;
};

export type TrelloV1AttachmentGetOutput = {
	date?: string;
	fileName?: string;
	id?: string;
	idMember?: string;
	isMalicious?: boolean;
	isUpload?: boolean;
	mimeType?: string;
	name?: string;
	pos?: number;
	previews?: Array<{
		_id?: string;
		bytes?: number;
		height?: number;
		id?: string;
		scaled?: boolean;
		url?: string;
		width?: number;
	}>;
	url?: string;
};

export type TrelloV1AttachmentGetAllOutput = {
	date?: string;
	fileName?: string;
	id?: string;
	idMember?: string;
	isUpload?: boolean;
	mimeType?: string;
	name?: string;
	pos?: number;
	previews?: Array<{
		_id?: string;
		bytes?: number;
		height?: number;
		id?: string;
		scaled?: boolean;
		url?: string;
		width?: number;
	}>;
	url?: string;
};

export type TrelloV1BoardCreateOutput = {
	closed?: boolean;
	desc?: string;
	descData?: null;
	id?: string;
	idEnterprise?: null;
	idOrganization?: string;
	labelNames?: {
		black?: string;
		black_dark?: string;
		black_light?: string;
		blue?: string;
		blue_dark?: string;
		blue_light?: string;
		green?: string;
		green_dark?: string;
		green_light?: string;
		lime?: string;
		lime_dark?: string;
		lime_light?: string;
		orange?: string;
		orange_dark?: string;
		orange_light?: string;
		pink?: string;
		pink_dark?: string;
		pink_light?: string;
		purple?: string;
		purple_dark?: string;
		purple_light?: string;
		red?: string;
		red_dark?: string;
		red_light?: string;
		sky?: string;
		sky_dark?: string;
		sky_light?: string;
		yellow?: string;
		yellow_dark?: string;
		yellow_light?: string;
	};
	name?: string;
	pinned?: boolean;
	prefs?: {
		background?: string;
		backgroundBottomColor?: string;
		backgroundBrightness?: string;
		backgroundDarkImage?: null;
		backgroundTile?: boolean;
		backgroundTopColor?: string;
		calendarFeedEnabled?: boolean;
		canBeEnterprise?: boolean;
		canBeOrg?: boolean;
		canBePrivate?: boolean;
		canBePublic?: boolean;
		canInvite?: boolean;
		cardAging?: string;
		cardCounts?: boolean;
		cardCovers?: boolean;
		comments?: string;
		hideVotes?: boolean;
		invitations?: string;
		isTemplate?: boolean;
		permissionLevel?: string;
		selfJoin?: boolean;
		showCompleteStatus?: boolean;
		switcherViews?: Array<{
			enabled?: boolean;
			viewType?: string;
		}>;
		voting?: string;
	};
	shortUrl?: string;
	url?: string;
};

export type TrelloV1BoardGetOutput = {
	closed?: boolean;
	desc?: string;
	id?: string;
	idEnterprise?: null;
	idOrganization?: string;
	labelNames?: {
		black?: string;
		black_dark?: string;
		black_light?: string;
		blue?: string;
		blue_dark?: string;
		blue_light?: string;
		green?: string;
		green_dark?: string;
		green_light?: string;
		lime?: string;
		lime_dark?: string;
		lime_light?: string;
		orange?: string;
		orange_dark?: string;
		orange_light?: string;
		pink?: string;
		pink_dark?: string;
		pink_light?: string;
		purple?: string;
		purple_dark?: string;
		purple_light?: string;
		red?: string;
		red_dark?: string;
		red_light?: string;
		sky?: string;
		sky_dark?: string;
		sky_light?: string;
		yellow?: string;
		yellow_dark?: string;
		yellow_light?: string;
	};
	name?: string;
	pinned?: boolean;
	prefs?: {
		background?: string;
		backgroundBottomColor?: string;
		backgroundBrightness?: string;
		backgroundTile?: boolean;
		backgroundTopColor?: string;
		calendarFeedEnabled?: boolean;
		canBeEnterprise?: boolean;
		canBeOrg?: boolean;
		canBePrivate?: boolean;
		canBePublic?: boolean;
		canInvite?: boolean;
		cardAging?: string;
		cardCounts?: boolean;
		cardCovers?: boolean;
		comments?: string;
		hiddenPluginBoardButtons?: Array<string>;
		hideVotes?: boolean;
		invitations?: string;
		isTemplate?: boolean;
		permissionLevel?: string;
		selfJoin?: boolean;
		showCompleteStatus?: boolean;
		switcherViews?: Array<{
			enabled?: boolean;
			viewType?: string;
		}>;
		voting?: string;
	};
	shortUrl?: string;
	url?: string;
};

export type TrelloV1BoardUpdateOutput = {
	closed?: boolean;
	desc?: string;
	id?: string;
	idEnterprise?: null;
	idOrganization?: string;
	labelNames?: {
		black?: string;
		black_dark?: string;
		black_light?: string;
		blue?: string;
		blue_dark?: string;
		blue_light?: string;
		green?: string;
		green_dark?: string;
		green_light?: string;
		lime?: string;
		lime_dark?: string;
		lime_light?: string;
		orange?: string;
		orange_dark?: string;
		orange_light?: string;
		pink?: string;
		pink_dark?: string;
		pink_light?: string;
		purple?: string;
		purple_dark?: string;
		purple_light?: string;
		red?: string;
		red_dark?: string;
		red_light?: string;
		sky?: string;
		sky_dark?: string;
		sky_light?: string;
		yellow?: string;
		yellow_dark?: string;
		yellow_light?: string;
	};
	name?: string;
	pinned?: boolean;
	prefs?: {
		background?: string;
		backgroundBottomColor?: string;
		backgroundBrightness?: string;
		backgroundTile?: boolean;
		backgroundTopColor?: string;
		calendarFeedEnabled?: boolean;
		canBeEnterprise?: boolean;
		canBeOrg?: boolean;
		canBePrivate?: boolean;
		canBePublic?: boolean;
		canInvite?: boolean;
		cardAging?: string;
		cardCounts?: boolean;
		cardCovers?: boolean;
		comments?: string;
		hideVotes?: boolean;
		invitations?: string;
		isTemplate?: boolean;
		permissionLevel?: string;
		selfJoin?: boolean;
		switcherViews?: Array<{
			enabled?: boolean;
			viewType?: string;
		}>;
		voting?: string;
	};
	shortUrl?: string;
	url?: string;
};

export type TrelloV1BoardMemberGetAllOutput = {
	fullName?: string;
	id?: string;
	username?: string;
};

export type TrelloV1CardCreateOutput = {
	attachments?: Array<{
		bytes?: null;
		date?: string;
		edgeColor?: null;
		id?: string;
		idMember?: string;
		isMalicious?: boolean;
		isUpload?: boolean;
		mimeType?: string;
		name?: string;
		pos?: number;
		url?: string;
	}>;
	badges?: {
		attachments?: number;
		attachmentsByType?: {
			trello?: {
				board?: number;
				card?: number;
			};
		};
		checkItems?: number;
		checkItemsChecked?: number;
		checkItemsEarliestDue?: null;
		comments?: number;
		description?: boolean;
		dueComplete?: boolean;
		externalSource?: null;
		fogbugz?: string;
		lastUpdatedByAi?: boolean;
		location?: boolean;
		start?: null;
		subscribed?: boolean;
		viewingMemberVoted?: boolean;
		votes?: number;
	};
	cardRole?: null;
	closed?: boolean;
	cover?: {
		brightness?: string;
		color?: null;
		idAttachment?: null;
		idPlugin?: null;
		idUploadedBackground?: null;
		size?: string;
	};
	dateLastActivity?: string;
	desc?: string;
	dueComplete?: boolean;
	dueReminder?: null;
	email?: null;
	id?: string;
	idAttachmentCover?: null;
	idBoard?: string;
	idChecklists?: Array<string>;
	idLabels?: Array<string>;
	idList?: string;
	idMembers?: Array<string>;
	idShort?: number;
	isTemplate?: boolean;
	labels?: Array<{
		id?: string;
		idBoard?: string;
		idOrganization?: string;
		name?: string;
		nodeId?: string;
		uses?: number;
	}>;
	manualCoverAttachment?: boolean;
	mirrorSourceId?: null;
	name?: string;
	nodeId?: string;
	pinned?: boolean;
	shortLink?: string;
	shortUrl?: string;
	start?: null;
	subscribed?: boolean;
	url?: string;
};

export type TrelloV1CardGetOutput = {
	badges?: {
		attachments?: number;
		attachmentsByType?: {
			trello?: {
				board?: number;
				card?: number;
			};
		};
		checkItems?: number;
		checkItemsChecked?: number;
		checkItemsEarliestDue?: null;
		comments?: number;
		description?: boolean;
		dueComplete?: boolean;
		externalSource?: null;
		fogbugz?: string;
		lastUpdatedByAi?: boolean;
		location?: boolean;
		subscribed?: boolean;
		viewingMemberVoted?: boolean;
		votes?: number;
	};
	cardRole?: null;
	checkItemStates?: Array<{
		idCheckItem?: string;
		state?: string;
	}>;
	closed?: boolean;
	cover?: {
		brightness?: string;
		idUploadedBackground?: null;
		size?: string;
	};
	dateLastActivity?: string;
	desc?: string;
	dueComplete?: boolean;
	email?: null;
	id?: string;
	idBoard?: string;
	idChecklists?: Array<string>;
	idLabels?: Array<string>;
	idList?: string;
	idMembers?: Array<string>;
	idShort?: number;
	isTemplate?: boolean;
	labels?: Array<{
		id?: string;
		idBoard?: string;
		idOrganization?: string;
		name?: string;
		nodeId?: string;
		uses?: number;
	}>;
	manualCoverAttachment?: boolean;
	mirrorSourceId?: null;
	name?: string;
	nodeId?: string;
	pinned?: boolean;
	shortLink?: string;
	shortUrl?: string;
	subscribed?: boolean;
	url?: string;
};

export type TrelloV1CardUpdateOutput = {
	badges?: {
		attachments?: number;
		attachmentsByType?: {
			trello?: {
				board?: number;
				card?: number;
			};
		};
		checkItems?: number;
		checkItemsChecked?: number;
		checkItemsEarliestDue?: null;
		comments?: number;
		description?: boolean;
		dueComplete?: boolean;
		fogbugz?: string;
		lastUpdatedByAi?: boolean;
		location?: boolean;
		subscribed?: boolean;
		viewingMemberVoted?: boolean;
		votes?: number;
	};
	cardRole?: null;
	checkItemStates?: Array<{
		idCheckItem?: string;
		state?: string;
	}>;
	closed?: boolean;
	cover?: {
		brightness?: string;
		idPlugin?: null;
		idUploadedBackground?: null;
		size?: string;
	};
	dateLastActivity?: string;
	desc?: string;
	dueComplete?: boolean;
	email?: null;
	id?: string;
	idBoard?: string;
	idChecklists?: Array<string>;
	idLabels?: Array<string>;
	idList?: string;
	idMembers?: Array<string>;
	idShort?: number;
	isTemplate?: boolean;
	labels?: Array<{
		color?: string;
		id?: string;
		idBoard?: string;
		idOrganization?: string;
		name?: string;
		nodeId?: string;
		uses?: number;
	}>;
	manualCoverAttachment?: boolean;
	name?: string;
	pinned?: boolean;
	shortLink?: string;
	shortUrl?: string;
	subscribed?: boolean;
	url?: string;
};

export type TrelloV1CardCommentCreateOutput = {
	appCreator?: {
		id?: string;
	};
	data?: {
		board?: {
			id?: string;
			name?: string;
			shortLink?: string;
		};
		card?: {
			id?: string;
			idShort?: number;
			name?: string;
			shortLink?: string;
		};
		list?: {
			id?: string;
			name?: string;
		};
		text?: string;
	};
	date?: string;
	display?: {
		entities?: {
			card?: {
				hideIfContext?: boolean;
				id?: string;
				shortLink?: string;
				text?: string;
				type?: string;
			};
			comment?: {
				text?: string;
				type?: string;
			};
			contextOn?: {
				hideIfContext?: boolean;
				idContext?: string;
				translationKey?: string;
				type?: string;
			};
			memberCreator?: {
				id?: string;
				text?: string;
				type?: string;
				username?: string;
			};
		};
		translationKey?: string;
	};
	entities?: Array<{
		hideIfContext?: boolean;
		id?: string;
		idContext?: string;
		shortLink?: string;
		text?: string;
		type?: string;
		username?: string;
	}>;
	id?: string;
	idMemberCreator?: string;
	limits?: {
		reactions?: {
			perAction?: {
				disableAt?: number;
				status?: string;
				warnAt?: number;
			};
			uniquePerAction?: {
				disableAt?: number;
				status?: string;
				warnAt?: number;
			};
		};
	};
	memberCreator?: {
		activityBlocked?: boolean;
		avatarHash?: string;
		avatarUrl?: string;
		fullName?: string;
		id?: string;
		initials?: string;
		nonPublicAvailable?: boolean;
		username?: string;
	};
	type?: string;
};

export type TrelloV1ChecklistCreateOutput = {
	checkItems?: Array<{
		due?: null;
		dueReminder?: number;
		id?: string;
		idChecklist?: string;
		idMember?: null;
		name?: string;
		pos?: number;
		state?: string;
	}>;
	id?: string;
	idBoard?: string;
	idCard?: string;
	name?: string;
	pos?: number;
};

export type TrelloV1ChecklistCreateCheckItemOutput = {
	due?: null;
	dueReminder?: null;
	id?: string;
	idChecklist?: string;
	idMember?: null;
	name?: string;
	pos?: number;
	state?: string;
};

export type TrelloV1ChecklistGetOutput = {
	checkItems?: Array<{
		id?: string;
		idChecklist?: string;
		name?: string;
		state?: string;
	}>;
	id?: string;
	idBoard?: string;
	idCard?: string;
	name?: string;
	pos?: number;
};

export type TrelloV1ChecklistGetAllOutput = {
	checkItems?: Array<{
		id?: string;
		idChecklist?: string;
		name?: string;
		pos?: number;
		state?: string;
	}>;
	id?: string;
	idBoard?: string;
	idCard?: string;
	name?: string;
	pos?: number;
};

export type TrelloV1LabelGetAllOutput = {
	id?: string;
	idBoard?: string;
	name?: string;
	uses?: number;
};

export type TrelloV1ListCreateOutput = {
	closed?: boolean;
	color?: null;
	datasource?: {
		filter?: boolean;
	};
	id?: string;
	idBoard?: string;
	name?: string;
	type?: null;
};

export type TrelloV1ListGetOutput = {
	closed?: boolean;
	datasource?: {
		filter?: boolean;
	};
	id?: string;
	idBoard?: string;
	name?: string;
	type?: null;
};

export type TrelloV1ListGetCardsOutput = {
	badges?: {
		attachments?: number;
		attachmentsByType?: {
			trello?: {
				board?: number;
				card?: number;
			};
		};
		checkItems?: number;
		checkItemsChecked?: number;
		checkItemsEarliestDue?: null;
		comments?: number;
		description?: boolean;
		dueComplete?: boolean;
		fogbugz?: string;
		lastUpdatedByAi?: boolean;
		location?: boolean;
		maliciousAttachments?: number;
		subscribed?: boolean;
		viewingMemberVoted?: boolean;
		votes?: number;
	};
	cardRole?: null;
	checkItemStates?: Array<{
		idCheckItem?: string;
		state?: string;
	}>;
	closed?: boolean;
	cover?: {
		brightness?: string;
		idUploadedBackground?: null;
		size?: string;
	};
	dateLastActivity?: string;
	desc?: string;
	dueComplete?: boolean;
	email?: null;
	id?: string;
	idBoard?: string;
	idChecklists?: Array<string>;
	idLabels?: Array<string>;
	idList?: string;
	idMembers?: Array<string>;
	idMembersVoted?: Array<string>;
	idShort?: number;
	isTemplate?: boolean;
	labels?: Array<{
		id?: string;
		idBoard?: string;
		idOrganization?: string;
		name?: string;
		nodeId?: string;
		uses?: number;
	}>;
	manualCoverAttachment?: boolean;
	mirrorSourceId?: null;
	name?: string;
	nodeId?: string;
	pinned?: boolean;
	shortLink?: string;
	shortUrl?: string;
	subscribed?: boolean;
	url?: string;
};

export type TrelloV1ListGetAllOutput = {
	closed?: boolean;
	datasource?: {
		filter?: boolean;
	};
	id?: string;
	idBoard?: string;
	name?: string;
	subscribed?: boolean;
	type?: null;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TrelloV1Credentials {
	trelloApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TrelloV1NodeBase {
	type: 'n8n-nodes-base.trello';
	version: 1;
	credentials?: TrelloV1Credentials;
}

export type TrelloV1AttachmentCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1AttachmentCreateConfig>;
	output?: TrelloV1AttachmentCreateOutput;
};

export type TrelloV1AttachmentDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1AttachmentDeleteConfig>;
};

export type TrelloV1AttachmentGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1AttachmentGetConfig>;
	output?: TrelloV1AttachmentGetOutput;
};

export type TrelloV1AttachmentGetAllNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1AttachmentGetAllConfig>;
	output?: TrelloV1AttachmentGetAllOutput;
};

export type TrelloV1BoardCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardCreateConfig>;
	output?: TrelloV1BoardCreateOutput;
};

export type TrelloV1BoardDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardDeleteConfig>;
};

export type TrelloV1BoardGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardGetConfig>;
	output?: TrelloV1BoardGetOutput;
};

export type TrelloV1BoardUpdateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardUpdateConfig>;
	output?: TrelloV1BoardUpdateOutput;
};

export type TrelloV1BoardMemberAddNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardMemberAddConfig>;
};

export type TrelloV1BoardMemberGetAllNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardMemberGetAllConfig>;
	output?: TrelloV1BoardMemberGetAllOutput;
};

export type TrelloV1BoardMemberInviteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardMemberInviteConfig>;
};

export type TrelloV1BoardMemberRemoveNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1BoardMemberRemoveConfig>;
};

export type TrelloV1CardCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardCreateConfig>;
	output?: TrelloV1CardCreateOutput;
};

export type TrelloV1CardDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardDeleteConfig>;
};

export type TrelloV1CardGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardGetConfig>;
	output?: TrelloV1CardGetOutput;
};

export type TrelloV1CardUpdateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardUpdateConfig>;
	output?: TrelloV1CardUpdateOutput;
};

export type TrelloV1CardCommentCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardCommentCreateConfig>;
	output?: TrelloV1CardCommentCreateOutput;
};

export type TrelloV1CardCommentDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardCommentDeleteConfig>;
};

export type TrelloV1CardCommentUpdateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1CardCommentUpdateConfig>;
};

export type TrelloV1ChecklistCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistCreateConfig>;
	output?: TrelloV1ChecklistCreateOutput;
};

export type TrelloV1ChecklistCreateCheckItemNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistCreateCheckItemConfig>;
	output?: TrelloV1ChecklistCreateCheckItemOutput;
};

export type TrelloV1ChecklistDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistDeleteConfig>;
};

export type TrelloV1ChecklistDeleteCheckItemNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistDeleteCheckItemConfig>;
};

export type TrelloV1ChecklistGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistGetConfig>;
	output?: TrelloV1ChecklistGetOutput;
};

export type TrelloV1ChecklistGetCheckItemNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistGetCheckItemConfig>;
};

export type TrelloV1ChecklistCompletedCheckItemsNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistCompletedCheckItemsConfig>;
};

export type TrelloV1ChecklistGetAllNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistGetAllConfig>;
	output?: TrelloV1ChecklistGetAllOutput;
};

export type TrelloV1ChecklistUpdateCheckItemNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ChecklistUpdateCheckItemConfig>;
};

export type TrelloV1LabelAddLabelNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelAddLabelConfig>;
};

export type TrelloV1LabelCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelCreateConfig>;
};

export type TrelloV1LabelDeleteNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelDeleteConfig>;
};

export type TrelloV1LabelGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelGetConfig>;
};

export type TrelloV1LabelGetAllNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelGetAllConfig>;
	output?: TrelloV1LabelGetAllOutput;
};

export type TrelloV1LabelRemoveLabelNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelRemoveLabelConfig>;
};

export type TrelloV1LabelUpdateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1LabelUpdateConfig>;
};

export type TrelloV1ListArchiveNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListArchiveConfig>;
};

export type TrelloV1ListCreateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListCreateConfig>;
	output?: TrelloV1ListCreateOutput;
};

export type TrelloV1ListGetNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListGetConfig>;
	output?: TrelloV1ListGetOutput;
};

export type TrelloV1ListGetCardsNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListGetCardsConfig>;
	output?: TrelloV1ListGetCardsOutput;
};

export type TrelloV1ListGetAllNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListGetAllConfig>;
	output?: TrelloV1ListGetAllOutput;
};

export type TrelloV1ListUpdateNode = TrelloV1NodeBase & {
	config: NodeConfig<TrelloV1ListUpdateConfig>;
};

export type TrelloV1Node =
	| TrelloV1AttachmentCreateNode
	| TrelloV1AttachmentDeleteNode
	| TrelloV1AttachmentGetNode
	| TrelloV1AttachmentGetAllNode
	| TrelloV1BoardCreateNode
	| TrelloV1BoardDeleteNode
	| TrelloV1BoardGetNode
	| TrelloV1BoardUpdateNode
	| TrelloV1BoardMemberAddNode
	| TrelloV1BoardMemberGetAllNode
	| TrelloV1BoardMemberInviteNode
	| TrelloV1BoardMemberRemoveNode
	| TrelloV1CardCreateNode
	| TrelloV1CardDeleteNode
	| TrelloV1CardGetNode
	| TrelloV1CardUpdateNode
	| TrelloV1CardCommentCreateNode
	| TrelloV1CardCommentDeleteNode
	| TrelloV1CardCommentUpdateNode
	| TrelloV1ChecklistCreateNode
	| TrelloV1ChecklistCreateCheckItemNode
	| TrelloV1ChecklistDeleteNode
	| TrelloV1ChecklistDeleteCheckItemNode
	| TrelloV1ChecklistGetNode
	| TrelloV1ChecklistGetCheckItemNode
	| TrelloV1ChecklistCompletedCheckItemsNode
	| TrelloV1ChecklistGetAllNode
	| TrelloV1ChecklistUpdateCheckItemNode
	| TrelloV1LabelAddLabelNode
	| TrelloV1LabelCreateNode
	| TrelloV1LabelDeleteNode
	| TrelloV1LabelGetNode
	| TrelloV1LabelGetAllNode
	| TrelloV1LabelRemoveLabelNode
	| TrelloV1LabelUpdateNode
	| TrelloV1ListArchiveNode
	| TrelloV1ListCreateNode
	| TrelloV1ListGetNode
	| TrelloV1ListGetCardsNode
	| TrelloV1ListGetAllNode
	| TrelloV1ListUpdateNode
	;