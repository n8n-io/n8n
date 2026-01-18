/**
 * Notion Node - Version 2
 * Consume Notion API
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

/** Append a block */
export type NotionV2BlockAppendConfig = {
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
export type NotionV2BlockGetAllConfig = {
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
export type NotionV2DatabaseGetConfig = {
	resource: 'database';
	operation: 'get';
/**
 * The Notion Database to get
 * @displayOptions.show { resource: ["database"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		databaseId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["database"], operation: ["getAll", "get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV2DatabaseGetAllConfig = {
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
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["database"], operation: ["getAll", "get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Search databases using text search */
export type NotionV2DatabaseSearchConfig = {
	resource: 'database';
	operation: 'search';
/**
 * The text to search for
 * @displayOptions.show { resource: ["database"], operation: ["search"] }
 */
		text?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["database"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["database"], operation: ["search"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["database"], operation: ["search"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a page in a database */
export type NotionV2DatabasePageCreateConfig = {
	resource: 'databasePage';
	operation: 'create';
/**
 * The Notion Database to operate on
 * @displayOptions.show { resource: ["databasePage"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		databaseId: ResourceLocatorValue;
/**
 * Page title. Appears at the top of the page and can be found via Quick Find.
 * @displayOptions.show { resource: ["databasePage"], operation: ["create"] }
 */
		title?: string | Expression<string>;
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

/** Get a database */
export type NotionV2DatabasePageGetConfig = {
	resource: 'databasePage';
	operation: 'get';
/**
 * The Notion Database Page to get
 * @displayOptions.show { resource: ["databasePage"], operation: ["get"] }
 * @default {"mode":"url","value":""}
 */
		pageId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["databasePage"], operation: ["get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV2DatabasePageGetAllConfig = {
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
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			/** The name of the property to filter by. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			key?: string | Expression<string>;
			/** Type
			 * @default ={{$parameter["&key"].split("|")[1]}}
			 */
			type?: unknown;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["title"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["rich_text"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["number"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'greater_than' | 'less_than' | 'greater_than_or_equal_to' | 'less_than_or_equal_to' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["checkbox"] }
			 */
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["select"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["multi_select"] }
			 */
			condition?: 'contains' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["status"] }
			 */
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["date"] }
			 */
			condition?: 'equals' | 'before' | 'after' | 'on_or_before' | 'is_empty' | 'is_not_empty' | 'on_or_after' | 'past_week' | 'past_month' | 'past_year' | 'next_week' | 'next_month' | 'next_year' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["people"] }
			 */
			condition?: 'contains' | 'does_not_contain' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["files"] }
			 */
			condition?: 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["url"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["email"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["phone_number"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["relation"] }
			 */
			condition?: 'contains' | 'does_not_contain' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["created_by"] }
			 */
			condition?: 'contains' | 'does_not_contain' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["created_time"] }
			 */
			condition?: 'equals' | 'before' | 'after' | 'on_or_before' | 'is_empty' | 'is_not_empty' | 'on_or_after' | 'past_week' | 'past_month' | 'past_year' | 'next_week' | 'next_month' | 'next_year' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["last_edited_by"] }
			 */
			condition?: 'contains' | 'does_not_contain' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["last_edited_time"] }
			 */
			condition?: 'equals' | 'before' | 'after' | 'on_or_before' | 'is_empty' | 'is_not_empty' | 'on_or_after' | 'past_week' | 'past_month' | 'past_year' | 'next_week' | 'next_month' | 'next_year' | Expression<string>;
			/** The formula return type
			 * @displayOptions.show { type: ["formula"] }
			 */
			returnType?: 'text' | 'checkbox' | 'number' | 'date' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["formula"], returnType: ["text"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["formula"], returnType: ["checkbox"] }
			 */
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["formula"], returnType: ["number"] }
			 */
			condition?: 'equals' | 'does_not_equal' | 'greater_than' | 'less_than' | 'greater_than_or_equal_to' | 'less_than_or_equal_to' | 'is_empty' | 'is_not_empty' | Expression<string>;
			/** The value of the property to filter by
			 * @displayOptions.show { type: ["formula"], returnType: ["date"] }
			 */
			condition?: 'equals' | 'before' | 'after' | 'on_or_before' | 'is_empty' | 'is_not_empty' | 'on_or_after' | 'past_week' | 'past_month' | 'past_year' | 'next_week' | 'next_month' | 'next_year' | Expression<string>;
			/** Title
			 * @displayOptions.show { type: ["title"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			titleValue?: string | Expression<string>;
			/** Text
			 * @displayOptions.show { type: ["rich_text"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			richTextValue?: string | Expression<string>;
			/** Phone number. No structure is enforced.
			 * @displayOptions.show { type: ["phone_number"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			phoneNumberValue?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["multi_select"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 * @default []
			 */
			multiSelectValue?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["select"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			selectValue?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["status"] }
			 */
			statusValue?: string | Expression<string>;
			/** Email
			 * @displayOptions.show { type: ["email"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			emailValue?: string | Expression<string>;
			/** URL
			 * @displayOptions.show { type: ["url"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			urlValue?: string | Expression<string>;
			/** List of users. Multiples can be defined separated by comma. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["people"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			peopleValue?: string | Expression<string>;
			/** List of users. Multiples can be defined separated by comma. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["created_by"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			createdByValue?: string | Expression<string>;
			/** List of users. Multiples can be defined separated by comma. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { type: ["last_edited_by"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			lastEditedByValue?: string | Expression<string>;
			/** Relation ID
			 * @displayOptions.show { type: ["relation"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			relationValue?: string | Expression<string>;
			/** Whether or not the checkbox is checked. &lt;code&gt;true&lt;/code&gt; represents checked. &lt;code&gt;false&lt;/code&gt; represents unchecked
			 * @displayOptions.show { type: ["checkbox"] }
			 * @default false
			 */
			checkboxValue?: boolean | Expression<boolean>;
			/** Number value
			 * @displayOptions.show { type: ["number"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 * @default 0
			 */
			numberValue?: number | Expression<number>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { type: ["date"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty", "past_week", "past_month", "past_year", "next_week", "next_month", "next_year"] }
			 */
			date?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { type: ["created_time"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty", "past_week", "past_month", "past_year", "next_week", "next_month", "next_year"] }
			 */
			createdTimeValue?: string | Expression<string>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { type: ["last_edited_time"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty", "past_week", "past_month", "past_year", "next_week", "next_month", "next_year"] }
			 */
			lastEditedTime?: string | Expression<string>;
			/** Number value
			 * @displayOptions.show { type: ["formula"], returnType: ["number"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 * @default 0
			 */
			numberValue?: number | Expression<number>;
			/** Text
			 * @displayOptions.show { type: ["formula"], returnType: ["text"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty"] }
			 */
			textValue?: string | Expression<string>;
			/** Whether or not the checkbox is checked. &lt;code&gt;true&lt;/code&gt; represents checked. &lt;code&gt;false&lt;/code&gt; represents unchecked
			 * @displayOptions.show { type: ["formula"], returnType: ["checkbox"] }
			 * @default false
			 */
			checkboxValue?: boolean | Expression<boolean>;
			/** An ISO 8601 format date, with optional time
			 * @displayOptions.show { type: ["formula"], returnType: ["date"] }
			 * @displayOptions.hide { condition: ["is_empty", "is_not_empty", "past_week", "past_month", "past_year", "next_week", "next_month", "next_year"] }
			 */
			dateValue?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update pages in a database */
export type NotionV2DatabasePageUpdateConfig = {
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

/** Archive a page */
export type NotionV2PageArchiveConfig = {
	resource: 'page';
	operation: 'archive';
/**
 * The Notion Page to archive
 * @displayOptions.show { resource: ["page"], operation: ["archive"] }
 * @default {"mode":"url","value":""}
 */
		pageId: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["page"], operation: ["archive"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Create a page in a database */
export type NotionV2PageCreateConfig = {
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

/** Search databases using text search */
export type NotionV2PageSearchConfig = {
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
export type NotionV2UserGetConfig = {
	resource: 'user';
	operation: 'get';
	userId: string | Expression<string>;
};

/** Get many child blocks */
export type NotionV2UserGetAllConfig = {
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

export type NotionV2Params =
	| NotionV2BlockAppendConfig
	| NotionV2BlockGetAllConfig
	| NotionV2DatabaseGetConfig
	| NotionV2DatabaseGetAllConfig
	| NotionV2DatabaseSearchConfig
	| NotionV2DatabasePageCreateConfig
	| NotionV2DatabasePageGetConfig
	| NotionV2DatabasePageGetAllConfig
	| NotionV2DatabasePageUpdateConfig
	| NotionV2PageArchiveConfig
	| NotionV2PageCreateConfig
	| NotionV2PageSearchConfig
	| NotionV2UserGetConfig
	| NotionV2UserGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NotionV2Credentials {
	notionApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type NotionV2Node = {
	type: 'n8n-nodes-base.notion';
	version: 2;
	config: NodeConfig<NotionV2Params>;
	credentials?: NotionV2Credentials;
};