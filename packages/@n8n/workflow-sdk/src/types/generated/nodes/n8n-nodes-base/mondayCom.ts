/**
 * Monday.com Node Types
 *
 * Consume Monday.com API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mondaycom/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Archive a board */
export type MondayComV1BoardArchiveConfig = {
	resource: 'board';
	operation: 'archive';
	/**
	 * Board unique identifiers. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
};

/** Create a new board */
export type MondayComV1BoardCreateConfig = {
	resource: 'board';
	operation: 'create';
	/**
	 * The board's name
	 */
	name: string | Expression<string>;
	/**
	 * The board's kind (public / private / share)
	 */
	kind: 'share' | 'public' | 'private' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a board */
export type MondayComV1BoardGetConfig = {
	resource: 'board';
	operation: 'get';
	/**
	 * Board unique identifiers. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
};

/** Get many boards */
export type MondayComV1BoardGetAllConfig = {
	resource: 'board';
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

/** Create a new board */
export type MondayComV1BoardColumnCreateConfig = {
	resource: 'boardColumn';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	title: string | Expression<string>;
	columnType:
		| 'checkbox'
		| 'country'
		| 'date'
		| 'dropdown'
		| 'email'
		| 'hour'
		| 'Link'
		| 'longText'
		| 'numbers'
		| 'people'
		| 'person'
		| 'phone'
		| 'rating'
		| 'status'
		| 'tags'
		| 'team'
		| 'text'
		| 'timeline'
		| 'timezone'
		| 'week'
		| 'worldClock'
		| Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many boards */
export type MondayComV1BoardColumnGetAllConfig = {
	resource: 'boardColumn';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
};

/** Delete a group in a board */
export type MondayComV1BoardGroupDeleteConfig = {
	resource: 'boardGroup';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupId: string | Expression<string>;
};

/** Create a new board */
export type MondayComV1BoardGroupCreateConfig = {
	resource: 'boardGroup';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	/**
	 * The group name
	 */
	name: string | Expression<string>;
};

/** Get many boards */
export type MondayComV1BoardGroupGetAllConfig = {
	resource: 'boardGroup';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
};

/** Add an update to an item */
export type MondayComV1BoardItemAddUpdateConfig = {
	resource: 'boardItem';
	operation: 'addUpdate';
	/**
	 * The unique identifier of the item to add update to
	 */
	itemId: string | Expression<string>;
	/**
	 * The update text to add
	 */
	value: string | Expression<string>;
};

/** Change a column value for a board item */
export type MondayComV1BoardItemChangeColumnValueConfig = {
	resource: 'boardItem';
	operation: 'changeColumnValue';
	/**
	 * The unique identifier of the board. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The unique identifier of the item to change column of
	 */
	itemId: string | Expression<string>;
	/**
	 * The column's unique identifier. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	columnId: string | Expression<string>;
	/**
	 * The column value in JSON format. Documentation can be found &lt;a href="https://monday.com/developers/v2#mutations-section-columns-change-column-value"&gt;here&lt;/a&gt;.
	 */
	value: IDataObject | string | Expression<string>;
};

/** Change multiple column values for a board item */
export type MondayComV1BoardItemChangeMultipleColumnValuesConfig = {
	resource: 'boardItem';
	operation: 'changeMultipleColumnValues';
	/**
	 * The unique identifier of the board. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * Item's ID
	 */
	itemId: string | Expression<string>;
	/**
	 * The column fields and values in JSON format. Documentation can be found &lt;a href="https://monday.com/developers/v2#mutations-section-columns-change-multiple-column-values"&gt;here&lt;/a&gt;.
	 */
	columnValues: IDataObject | string | Expression<string>;
};

/** Create a new board */
export type MondayComV1BoardItemCreateConfig = {
	resource: 'boardItem';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupId: string | Expression<string>;
	/**
	 * The new item's name
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group in a board */
export type MondayComV1BoardItemDeleteConfig = {
	resource: 'boardItem';
	operation: 'delete';
	/**
	 * Item's ID
	 */
	itemId: string | Expression<string>;
};

/** Get a board */
export type MondayComV1BoardItemGetConfig = {
	resource: 'boardItem';
	operation: 'get';
	/**
	 * Item's ID (Multiple can be added separated by comma)
	 */
	itemId: string | Expression<string>;
};

/** Get items by column value */
export type MondayComV1BoardItemGetByColumnValueConfig = {
	resource: 'boardItem';
	operation: 'getByColumnValue';
	/**
	 * The unique identifier of the board. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	boardId: string | Expression<string>;
	/**
	 * The column's unique identifier. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	columnId: string | Expression<string>;
	/**
	 * The column value to search items by
	 */
	columnValue: string | Expression<string>;
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

/** Get many boards */
export type MondayComV1BoardItemGetAllConfig = {
	resource: 'boardItem';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupId: string | Expression<string>;
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

/** Move item to group */
export type MondayComV1BoardItemMoveConfig = {
	resource: 'boardItem';
	operation: 'move';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	boardId: string | Expression<string>;
	/**
	 * The item's ID
	 */
	itemId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupId: string | Expression<string>;
};

export type MondayComV1Params =
	| MondayComV1BoardArchiveConfig
	| MondayComV1BoardCreateConfig
	| MondayComV1BoardGetConfig
	| MondayComV1BoardGetAllConfig
	| MondayComV1BoardColumnCreateConfig
	| MondayComV1BoardColumnGetAllConfig
	| MondayComV1BoardGroupDeleteConfig
	| MondayComV1BoardGroupCreateConfig
	| MondayComV1BoardGroupGetAllConfig
	| MondayComV1BoardItemAddUpdateConfig
	| MondayComV1BoardItemChangeColumnValueConfig
	| MondayComV1BoardItemChangeMultipleColumnValuesConfig
	| MondayComV1BoardItemCreateConfig
	| MondayComV1BoardItemDeleteConfig
	| MondayComV1BoardItemGetConfig
	| MondayComV1BoardItemGetByColumnValueConfig
	| MondayComV1BoardItemGetAllConfig
	| MondayComV1BoardItemMoveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MondayComV1Credentials {
	mondayComApi: CredentialReference;
	mondayComOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MondayComNode = {
	type: 'n8n-nodes-base.mondayCom';
	version: 1;
	config: NodeConfig<MondayComV1Params>;
	credentials?: MondayComV1Credentials;
};
