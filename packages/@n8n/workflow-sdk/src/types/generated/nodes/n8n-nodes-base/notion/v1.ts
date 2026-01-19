/**
 * Notion Node - Version 1
 * Consume Notion API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Append a block */
export type NotionV1BlockAppendConfig = {
	resource: 'block';
	operation: 'append';
/**
 * The Notion Block to append blocks to
 * @displayOptions.show { resource: ["block"], operation: ["append"] }
 * @default {"mode":"url","value":""}
 */
		blockId: ResourceLocatorValue;
	blockUi?: {
		blockValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default paragraph
			 */
			type?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["paragraph"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["paragraph"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["paragraph"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_1"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_1"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_1"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_2"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_2"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_2"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_3"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_3"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_3"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["toggle"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["toggle"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["toggle"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Whether the to_do is checked or not
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			checked?: boolean | Expression<boolean>;
			/** Rich Text
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["to_do"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["to_do"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Plain text of page title
			 * @displayOptions.show { type: ["child_page"] }
			 */
			title?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["bulleted_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["numbered_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Image file reference
			 * @displayOptions.show { type: ["image"] }
			 */
			url?: string | Expression<string>;
		}>;
	};
};

/** Get many child blocks */
export type NotionV1BlockGetAllConfig = {
	resource: 'block';
	operation: 'getAll';
/**
 * The Notion Block to get all children from
 * @displayOptions.show { resource: ["block"], operation: ["getAll"] }
 * @default {"mode":"url","value":""}
 */
		blockId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["block"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["block"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	fetchNestedBlocks?: boolean | Expression<boolean>;
};

/** Get a database */
export type NotionV1DatabaseGetConfig = {
	resource: 'database';
	operation: 'get';
/**
 * The Notion Database to get
 * @displayOptions.show { resource: ["database"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		databaseId: ResourceLocatorValue;
};

/** Get many child blocks */
export type NotionV1DatabaseGetAllConfig = {
	resource: 'database';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["database"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["database"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a pages in a database */
export type NotionV1DatabasePageCreateConfig = {
	resource: 'databasePage';
	operation: 'create';
/**
 * The Notion Database to operate on
 * @displayOptions.show { resource: ["databasePage"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		databaseId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["databasePage"], operation: ["create"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			key?: string | Expression<string>;
			/** Type
			 * @default ={{$parameter["&key"].split("|")[1]}}
			 */
			type?: unknown;
			/** Title
			 * @displayOptions.show { type: ["title"] }
			 */
			title?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["rich_text"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["rich_text"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["rich_text"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Phone number. No structure is enforced.
			 * @displayOptions.show { type: ["phone_number"] }
			 */
			phoneValue?: string | Expression<string>;
			/** Name of the options you want to set. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["multi_select"] }
			 * @default []
			 */
			multiSelectValue?: string[];
			/** Name of the option you want to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["select"] }
			 */
			selectValue?: string | Expression<string>;
			/** Name of the option you want to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["status"] }
			 */
			statusValue?: string | Expression<string>;
			/** Email address
			 * @displayOptions.show { type: ["email"] }
			 */
			emailValue?: string | Expression<string>;
			/** Ignore If Empty
			 * @displayOptions.show { type: ["url"] }
			 * @default false
			 */
			ignoreIfEmpty?: boolean | Expression<boolean>;
			/** Web address
			 * @displayOptions.show { type: ["url"] }
			 */
			urlValue?: string | Expression<string>;
			/** List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["people"] }
			 * @default []
			 */
			peopleValue?: string[];
			/** List of databases that belong to another database. Multiples can be defined separated by comma.
			 * @displayOptions.show { type: ["relation"] }
			 * @default []
			 */
			relationValue?: string | Expression<string>;
			/** Whether or not the checkbox is checked. &lt;code&gt;true&lt;/code&gt; represents checked. &lt;code&gt;false&lt;/code&gt; represents unchecked.
			 * @displayOptions.show { type: ["checkbox"] }
			 * @default false
			 */
			checkboxValue?: boolean | Expression<boolean>;
			/** Number value
			 * @displayOptions.show { type: ["number"] }
			 * @default 0
			 */
			numberValue?: number | Expression<number>;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { type: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** Whether or not to include the time in the date
			 * @displayOptions.show { type: ["date"] }
			 * @default true
			 */
			includeTime?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { range: [false], type: ["date"] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { range: [true], type: ["date"] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], type: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["date"] }
			 * @default default
			 */
			timezone?: string | Expression<string>;
			/** File URLs
			 * @displayOptions.show { type: ["files"] }
			 * @default {}
			 */
			fileUrls?: {
		fileUrl?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Link to externally hosted file
			 */
			url?: string | Expression<string>;
		}>;
	};
		}>;
	};
	blockUi?: {
		blockValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default paragraph
			 */
			type?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["paragraph"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["paragraph"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["paragraph"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_1"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_1"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_1"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_2"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_2"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_2"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_3"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_3"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_3"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["toggle"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["toggle"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["toggle"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Whether the to_do is checked or not
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			checked?: boolean | Expression<boolean>;
			/** Rich Text
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["to_do"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["to_do"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Plain text of page title
			 * @displayOptions.show { type: ["child_page"] }
			 */
			title?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["bulleted_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["numbered_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Image file reference
			 * @displayOptions.show { type: ["image"] }
			 */
			url?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get many child blocks */
export type NotionV1DatabasePageGetAllConfig = {
	resource: 'databasePage';
	operation: 'getAll';
/**
 * The Notion Database to operate on
 * @displayOptions.show { resource: ["databasePage"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		databaseId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["databasePage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["databasePage"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["databasePage"], operation: ["getAll"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Update pages in a database */
export type NotionV1DatabasePageUpdateConfig = {
	resource: 'databasePage';
	operation: 'update';
/**
 * The Notion Database Page to update
 * @displayOptions.show { resource: ["databasePage"], operation: ["update"] }
 * @default {"mode":"url","value":""}
 */
		pageId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["databasePage"], operation: ["update"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			key?: string | Expression<string>;
			/** Type
			 * @default ={{$parameter["&key"].split("|")[1]}}
			 */
			type?: unknown;
			/** Title
			 * @displayOptions.show { type: ["title"] }
			 */
			title?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["rich_text"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["rich_text"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["rich_text"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Phone number. No structure is enforced.
			 * @displayOptions.show { type: ["phone_number"] }
			 */
			phoneValue?: string | Expression<string>;
			/** Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["multi_select"] }
			 * @default []
			 */
			multiSelectValue?: string[];
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["select"] }
			 */
			selectValue?: string | Expression<string>;
			/** Name of the option you want to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["status"] }
			 */
			statusValue?: string | Expression<string>;
			/** Email
			 * @displayOptions.show { type: ["email"] }
			 */
			emailValue?: string | Expression<string>;
			/** Ignore If Empty
			 * @displayOptions.show { type: ["url"] }
			 * @default false
			 */
			ignoreIfEmpty?: boolean | Expression<boolean>;
			/** Web address
			 * @displayOptions.show { type: ["url"] }
			 */
			urlValue?: string | Expression<string>;
			/** List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["people"] }
			 * @default []
			 */
			peopleValue?: string[];
			/** List of databases that belong to another database. Multiples can be defined separated by comma.
			 * @displayOptions.show { type: ["relation"] }
			 * @default []
			 */
			relationValue?: string | Expression<string>;
			/** Whether or not the checkbox is checked. &lt;code&gt;true&lt;/code&gt; represents checked. &lt;code&gt;false&lt;/code&gt; represents unchecked.
			 * @displayOptions.show { type: ["checkbox"] }
			 * @default false
			 */
			checkboxValue?: boolean | Expression<boolean>;
			/** Number value
			 * @displayOptions.show { type: ["number"] }
			 * @default 0
			 */
			numberValue?: number | Expression<number>;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { type: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** Whether or not to include the time in the date
			 * @displayOptions.show { type: ["date"] }
			 * @default true
			 */
			includeTime?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { range: [false], type: ["date"] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { range: [true], type: ["date"] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], type: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["date"] }
			 * @default default
			 */
			timezone?: string | Expression<string>;
			/** File URLs
			 * @displayOptions.show { type: ["files"] }
			 * @default {}
			 */
			fileUrls?: {
		fileUrl?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Link to externally hosted file
			 */
			url?: string | Expression<string>;
		}>;
	};
		}>;
	};
	options?: Record<string, unknown>;
};

/** Create a pages in a database */
export type NotionV1PageCreateConfig = {
	resource: 'page';
	operation: 'create';
/**
 * The Notion Database Page to create a child page for
 * @displayOptions.show { resource: ["page"], operation: ["create"] }
 * @default {"mode":"url","value":""}
 */
		pageId: ResourceLocatorValue;
/**
 * Page title. Appears at the top of the page and can be found via Quick Find.
 * @displayOptions.show { resource: ["page"], operation: ["create"] }
 */
		title: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["page"], operation: ["create"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	blockUi?: {
		blockValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default paragraph
			 */
			type?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["paragraph"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["paragraph"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["paragraph"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_1"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_1"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_1"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_2"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_2"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_2"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["heading_3"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["heading_3"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["heading_3"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["toggle"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["toggle"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["toggle"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Whether the to_do is checked or not
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			checked?: boolean | Expression<boolean>;
			/** Rich Text
			 * @displayOptions.show { type: ["to_do"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["to_do"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["to_do"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Plain text of page title
			 * @displayOptions.show { type: ["child_page"] }
			 */
			title?: string | Expression<string>;
			/** Rich Text
			 * @displayOptions.show { type: ["bulleted_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["bulleted_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Rich Text
			 * @displayOptions.show { type: ["numbered_list_item"] }
			 * @default false
			 */
			richText?: boolean | Expression<boolean>;
			/** Text
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [false] }
			 */
			textContent?: string | Expression<string>;
			/** Rich text in the block
			 * @displayOptions.show { type: ["numbered_list_item"], richText: [true] }
			 * @default {}
			 */
			text?: {
		text?: Array<{
			/** Type
			 * @default text
			 */
			textType?: 'equation' | 'mention' | 'text' | Expression<string>;
			/** Text content. This field contains the actual content of your text and is probably the field you'll use most often.
			 * @displayOptions.show { textType: ["text"] }
			 */
			text?: string | Expression<string>;
			/** Is Link
			 * @displayOptions.show { textType: ["text"] }
			 * @default false
			 */
			isLink?: boolean | Expression<boolean>;
			/** The URL that this link points to
			 * @displayOptions.show { textType: ["text"], isLink: [true] }
			 */
			textLink?: string | Expression<string>;
			/** An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.
			 * @displayOptions.show { textType: ["mention"] }
			 */
			mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
			/** The ID of the user being mentioned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { mentionType: ["user"] }
			 */
			user?: string | Expression<string>;
			/** The ID of the page being mentioned
			 * @displayOptions.show { mentionType: ["page"] }
			 */
			page?: string | Expression<string>;
			/** The Notion Database being mentioned
			 * @displayOptions.show { mentionType: ["database"] }
			 * @default {"mode":"list","value":""}
			 */
			database?: ResourceLocatorValue;
			/** Whether or not you want to define a date range
			 * @displayOptions.show { mentionType: ["date"] }
			 * @default false
			 */
			range?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [false] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { mentionType: ["date"], range: [true] }
			 */
			dateStart?: string | Expression<string>;
			/** An ISO 8601 formatted date, with optional time. Represents the end of a date range.
			 * @displayOptions.show { range: [true], mentionType: ["date"] }
			 */
			dateEnd?: string | Expression<string>;
			/** Expression
			 * @displayOptions.show { textType: ["equation"] }
			 */
			expression?: string | Expression<string>;
			/** All annotations that apply to this rich text
			 * @default {}
			 */
			annotationUi?: Record<string, unknown>;
		}>;
	};
			/** Image file reference
			 * @displayOptions.show { type: ["image"] }
			 */
			url?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV1PageGetConfig = {
	resource: 'page';
	operation: 'get';
/**
 * The Page URL from Notion's 'copy link' functionality (or just the ID contained within the URL)
 * @displayOptions.show { resource: ["page"], operation: ["get"] }
 */
		pageId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["page"], operation: ["get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Text search of pages */
export type NotionV1PageSearchConfig = {
	resource: 'page';
	operation: 'search';
/**
 * The text to search for
 * @displayOptions.show { resource: ["page"], operation: ["search"] }
 */
		text?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["page"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["page"], operation: ["search"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["page"], operation: ["search"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	userId: string | Expression<string>;
};

/** Get many child blocks */
export type NotionV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type NotionV1Params =
	| NotionV1BlockAppendConfig
	| NotionV1BlockGetAllConfig
	| NotionV1DatabaseGetConfig
	| NotionV1DatabaseGetAllConfig
	| NotionV1DatabasePageCreateConfig
	| NotionV1DatabasePageGetAllConfig
	| NotionV1DatabasePageUpdateConfig
	| NotionV1PageCreateConfig
	| NotionV1PageGetConfig
	| NotionV1PageSearchConfig
	| NotionV1UserGetConfig
	| NotionV1UserGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type NotionV1PageGetOutput = {
	id?: string;
	'Messaggi Schedulati'?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface NotionV1Credentials {
	notionApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface NotionV1NodeBase {
	type: 'n8n-nodes-base.notion';
	version: 1;
	credentials?: NotionV1Credentials;
}

export type NotionV1BlockAppendNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1BlockAppendConfig>;
};

export type NotionV1BlockGetAllNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1BlockGetAllConfig>;
};

export type NotionV1DatabaseGetNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1DatabaseGetConfig>;
};

export type NotionV1DatabaseGetAllNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1DatabaseGetAllConfig>;
};

export type NotionV1DatabasePageCreateNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1DatabasePageCreateConfig>;
};

export type NotionV1DatabasePageGetAllNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1DatabasePageGetAllConfig>;
};

export type NotionV1DatabasePageUpdateNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1DatabasePageUpdateConfig>;
};

export type NotionV1PageCreateNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1PageCreateConfig>;
};

export type NotionV1PageGetNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1PageGetConfig>;
	output?: NotionV1PageGetOutput;
};

export type NotionV1PageSearchNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1PageSearchConfig>;
};

export type NotionV1UserGetNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1UserGetConfig>;
};

export type NotionV1UserGetAllNode = NotionV1NodeBase & {
	config: NodeConfig<NotionV1UserGetAllConfig>;
};

export type NotionV1Node =
	| NotionV1BlockAppendNode
	| NotionV1BlockGetAllNode
	| NotionV1DatabaseGetNode
	| NotionV1DatabaseGetAllNode
	| NotionV1DatabasePageCreateNode
	| NotionV1DatabasePageGetAllNode
	| NotionV1DatabasePageUpdateNode
	| NotionV1PageCreateNode
	| NotionV1PageGetNode
	| NotionV1PageSearchNode
	| NotionV1UserGetNode
	| NotionV1UserGetAllNode
	;