/**
 * Notion Node Types
 *
 * Consume Notion API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/notion/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Append a block */
export type NotionV22BlockAppendConfig = {
	resource: 'block';
	operation: 'append';
	/**
	 * The Notion Block to append blocks to
	 * @default {"mode":"url","value":""}
	 */
	blockId: ResourceLocatorValue;
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			url?: string | Expression<string>;
		}>;
	};
};

/** Get many child blocks */
export type NotionV22BlockGetAllConfig = {
	resource: 'block';
	operation: 'getAll';
	/**
	 * The Notion Block to get all children from
	 * @default {"mode":"url","value":""}
	 */
	blockId: ResourceLocatorValue;
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
	fetchNestedBlocks?: boolean | Expression<boolean>;
	simplifyOutput?: boolean | Expression<boolean>;
};

/** Get a database */
export type NotionV22DatabaseGetConfig = {
	resource: 'database';
	operation: 'get';
	/**
	 * The Notion Database to get
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV22DatabaseGetAllConfig = {
	resource: 'database';
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Search databases using text search */
export type NotionV22DatabaseSearchConfig = {
	resource: 'database';
	operation: 'search';
	/**
	 * The text to search for
	 */
	text?: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a page in a database */
export type NotionV22DatabasePageCreateConfig = {
	resource: 'databasePage';
	operation: 'create';
	/**
	 * The Notion Database to operate on
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Page title. Appears at the top of the page and can be found via Quick Find.
	 */
	title?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			phoneValue?: string | Expression<string>;
			multiSelectValue?: string[];
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			ignoreIfEmpty?: boolean | Expression<boolean>;
			urlValue?: string | Expression<string>;
			peopleValue?: string[];
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			range?: boolean | Expression<boolean>;
			includeTime?: boolean | Expression<boolean>;
			date?: string | Expression<string>;
			dateStart?: string | Expression<string>;
			dateEnd?: string | Expression<string>;
			timezone?: string | Expression<string>;
			fileUrls?: {
				fileUrl?: Array<{ name?: string | Expression<string>; url?: string | Expression<string> }>;
			};
		}>;
	};
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			url?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV22DatabasePageGetConfig = {
	resource: 'databasePage';
	operation: 'get';
	/**
	 * The Notion Database Page to get
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV22DatabasePageGetAllConfig = {
	resource: 'databasePage';
	operation: 'getAll';
	/**
	 * The Notion Database to operate on
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'greater_than'
				| 'less_than'
				| 'greater_than_or_equal_to'
				| 'less_than_or_equal_to'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?: 'equals' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?: 'contains' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			returnType?: 'text' | 'checkbox' | 'number' | 'date' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'greater_than'
				| 'less_than'
				| 'greater_than_or_equal_to'
				| 'less_than_or_equal_to'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			titleValue?: string | Expression<string>;
			richTextValue?: string | Expression<string>;
			phoneNumberValue?: string | Expression<string>;
			multiSelectValue?: string | Expression<string>;
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			urlValue?: string | Expression<string>;
			peopleValue?: string | Expression<string>;
			createdByValue?: string | Expression<string>;
			lastEditedByValue?: string | Expression<string>;
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			date?: string | Expression<string>;
			createdTimeValue?: string | Expression<string>;
			lastEditedTime?: string | Expression<string>;
			numberValue?: number | Expression<number>;
			textValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			dateValue?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update pages in a database */
export type NotionV22DatabasePageUpdateConfig = {
	resource: 'databasePage';
	operation: 'update';
	/**
	 * The Notion Database Page to update
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			phoneValue?: string | Expression<string>;
			multiSelectValue?: string[];
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			ignoreIfEmpty?: boolean | Expression<boolean>;
			urlValue?: string | Expression<string>;
			peopleValue?: string[];
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			range?: boolean | Expression<boolean>;
			includeTime?: boolean | Expression<boolean>;
			date?: string | Expression<string>;
			dateStart?: string | Expression<string>;
			dateEnd?: string | Expression<string>;
			timezone?: string | Expression<string>;
			fileUrls?: {
				fileUrl?: Array<{ name?: string | Expression<string>; url?: string | Expression<string> }>;
			};
		}>;
	};
	options?: Record<string, unknown>;
};

/** Create a page in a database */
export type NotionV22PageCreateConfig = {
	resource: 'page';
	operation: 'create';
	/**
	 * The Notion Database Page to create a child page for
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Page title. Appears at the top of the page and can be found via Quick Find.
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			url?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV22PageGetConfig = {
	resource: 'page';
	operation: 'get';
	/**
	 * The Page URL from Notion's 'copy link' functionality (or just the ID contained within the URL)
	 */
	pageId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Search databases using text search */
export type NotionV22PageSearchConfig = {
	resource: 'page';
	operation: 'search';
	/**
	 * The text to search for
	 */
	text?: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV22UserGetConfig = {
	resource: 'user';
	operation: 'get';
	userId: string | Expression<string>;
};

/** Get many child blocks */
export type NotionV22UserGetAllConfig = {
	resource: 'user';
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

export type NotionV22Params =
	| NotionV22BlockAppendConfig
	| NotionV22BlockGetAllConfig
	| NotionV22DatabaseGetConfig
	| NotionV22DatabaseGetAllConfig
	| NotionV22DatabaseSearchConfig
	| NotionV22DatabasePageCreateConfig
	| NotionV22DatabasePageGetConfig
	| NotionV22DatabasePageGetAllConfig
	| NotionV22DatabasePageUpdateConfig
	| NotionV22PageCreateConfig
	| NotionV22PageGetConfig
	| NotionV22PageSearchConfig
	| NotionV22UserGetConfig
	| NotionV22UserGetAllConfig;

/** Append a block */
export type NotionV1BlockAppendConfig = {
	resource: 'block';
	operation: 'append';
	/**
	 * The Notion Block to append blocks to
	 * @default {"mode":"url","value":""}
	 */
	blockId: ResourceLocatorValue;
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
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
	 * @default {"mode":"url","value":""}
	 */
	blockId: ResourceLocatorValue;
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
	fetchNestedBlocks?: boolean | Expression<boolean>;
	simplifyOutput?: boolean | Expression<boolean>;
};

/** Get a database */
export type NotionV1DatabaseGetConfig = {
	resource: 'database';
	operation: 'get';
	/**
	 * The Notion Database to get
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV1DatabaseGetAllConfig = {
	resource: 'database';
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Search databases using text search */
export type NotionV1DatabaseSearchConfig = {
	resource: 'database';
	operation: 'search';
	/**
	 * The text to search for
	 */
	text?: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a page in a database */
export type NotionV1DatabasePageCreateConfig = {
	resource: 'databasePage';
	operation: 'create';
	/**
	 * The Notion Database to operate on
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Page title. Appears at the top of the page and can be found via Quick Find.
	 */
	title?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			phoneValue?: string | Expression<string>;
			multiSelectValue?: string[];
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			ignoreIfEmpty?: boolean | Expression<boolean>;
			urlValue?: string | Expression<string>;
			peopleValue?: string[];
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			range?: boolean | Expression<boolean>;
			includeTime?: boolean | Expression<boolean>;
			date?: string | Expression<string>;
			dateStart?: string | Expression<string>;
			dateEnd?: string | Expression<string>;
			timezone?: string | Expression<string>;
			fileUrls?: {
				fileUrl?: Array<{ name?: string | Expression<string>; url?: string | Expression<string> }>;
			};
		}>;
	};
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			url?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get a database */
export type NotionV1DatabasePageGetConfig = {
	resource: 'databasePage';
	operation: 'get';
	/**
	 * The Notion Database Page to get
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many child blocks */
export type NotionV1DatabasePageGetAllConfig = {
	resource: 'databasePage';
	operation: 'getAll';
	/**
	 * The Notion Database to operate on
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'greater_than'
				| 'less_than'
				| 'greater_than_or_equal_to'
				| 'less_than_or_equal_to'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?: 'equals' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?: 'contains' | 'does_not_equal' | 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'is_empty' | 'is_not_empty' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			condition?:
				| 'contains'
				| 'does_not_contain'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			returnType?: 'text' | 'checkbox' | 'number' | 'date' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'contains'
				| 'does_not_contain'
				| 'starts_with'
				| 'ends_with'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?: 'equals' | 'does_not_equal' | Expression<string>;
			condition?:
				| 'equals'
				| 'does_not_equal'
				| 'greater_than'
				| 'less_than'
				| 'greater_than_or_equal_to'
				| 'less_than_or_equal_to'
				| 'is_empty'
				| 'is_not_empty'
				| Expression<string>;
			condition?:
				| 'equals'
				| 'before'
				| 'after'
				| 'on_or_before'
				| 'is_empty'
				| 'is_not_empty'
				| 'on_or_after'
				| 'past_week'
				| 'past_month'
				| 'past_year'
				| 'next_week'
				| 'next_month'
				| 'next_year'
				| Expression<string>;
			titleValue?: string | Expression<string>;
			richTextValue?: string | Expression<string>;
			phoneNumberValue?: string | Expression<string>;
			multiSelectValue?: string | Expression<string>;
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			urlValue?: string | Expression<string>;
			peopleValue?: string | Expression<string>;
			createdByValue?: string | Expression<string>;
			lastEditedByValue?: string | Expression<string>;
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			date?: string | Expression<string>;
			createdTimeValue?: string | Expression<string>;
			lastEditedTime?: string | Expression<string>;
			numberValue?: number | Expression<number>;
			textValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			dateValue?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update pages in a database */
export type NotionV1DatabasePageUpdateConfig = {
	resource: 'databasePage';
	operation: 'update';
	/**
	 * The Notion Database Page to update
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	propertiesUi?: {
		propertyValues?: Array<{
			key?: string | Expression<string>;
			type?: unknown;
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			phoneValue?: string | Expression<string>;
			multiSelectValue?: string[];
			selectValue?: string | Expression<string>;
			statusValue?: string | Expression<string>;
			emailValue?: string | Expression<string>;
			ignoreIfEmpty?: boolean | Expression<boolean>;
			urlValue?: string | Expression<string>;
			peopleValue?: string[];
			relationValue?: string | Expression<string>;
			checkboxValue?: boolean | Expression<boolean>;
			numberValue?: number | Expression<number>;
			range?: boolean | Expression<boolean>;
			includeTime?: boolean | Expression<boolean>;
			date?: string | Expression<string>;
			dateStart?: string | Expression<string>;
			dateEnd?: string | Expression<string>;
			timezone?: string | Expression<string>;
			fileUrls?: {
				fileUrl?: Array<{ name?: string | Expression<string>; url?: string | Expression<string> }>;
			};
		}>;
	};
	options?: Record<string, unknown>;
};

/** Create a page in a database */
export type NotionV1PageCreateConfig = {
	resource: 'page';
	operation: 'create';
	/**
	 * The Notion Database Page to create a child page for
	 * @default {"mode":"url","value":""}
	 */
	pageId: ResourceLocatorValue;
	/**
	 * Page title. Appears at the top of the page and can be found via Quick Find.
	 */
	title: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	blockUi?: {
		blockValues?: Array<{
			type?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			checked?: boolean | Expression<boolean>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			title?: string | Expression<string>;
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
			richText?: boolean | Expression<boolean>;
			textContent?: string | Expression<string>;
			text?: {
				text?: Array<{
					textType?: 'equation' | 'mention' | 'text' | Expression<string>;
					text?: string | Expression<string>;
					isLink?: boolean | Expression<boolean>;
					textLink?: string | Expression<string>;
					mentionType?: 'database' | 'date' | 'page' | 'user' | Expression<string>;
					user?: string | Expression<string>;
					page?: string | Expression<string>;
					database?: ResourceLocatorValue;
					range?: boolean | Expression<boolean>;
					date?: string | Expression<string>;
					dateStart?: string | Expression<string>;
					dateEnd?: string | Expression<string>;
					expression?: string | Expression<string>;
					annotationUi?: Record<string, unknown>;
				}>;
			};
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
	 */
	pageId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Search databases using text search */
export type NotionV1PageSearchConfig = {
	resource: 'page';
	operation: 'search';
	/**
	 * The text to search for
	 */
	text?: string | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type NotionV1Params =
	| NotionV1BlockAppendConfig
	| NotionV1BlockGetAllConfig
	| NotionV1DatabaseGetConfig
	| NotionV1DatabaseGetAllConfig
	| NotionV1DatabaseSearchConfig
	| NotionV1DatabasePageCreateConfig
	| NotionV1DatabasePageGetConfig
	| NotionV1DatabasePageGetAllConfig
	| NotionV1DatabasePageUpdateConfig
	| NotionV1PageCreateConfig
	| NotionV1PageGetConfig
	| NotionV1PageSearchConfig
	| NotionV1UserGetConfig
	| NotionV1UserGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NotionV22Credentials {
	notionApi: CredentialReference;
}

export interface NotionV1Credentials {
	notionApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type NotionV22Node = {
	type: 'n8n-nodes-base.notion';
	version: 2 | 2.1 | 2.2;
	config: NodeConfig<NotionV22Params>;
	credentials?: NotionV22Credentials;
};

export type NotionV1Node = {
	type: 'n8n-nodes-base.notion';
	version: 1;
	config: NodeConfig<NotionV1Params>;
	credentials?: NotionV1Credentials;
};

export type NotionNode = NotionV22Node | NotionV1Node;
