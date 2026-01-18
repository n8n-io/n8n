/**
 * AWS DynamoDB Node - Version 1
 * Consume the AWS DynamoDB API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new record, or update the current one if it already exists (upsert) */
export type AwsDynamoDbV1ItemUpsertConfig = {
	resource: 'item';
	operation: 'upsert';
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"] }
 * @default []
 */
		tableName: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["upsert"] }
 * @default defineBelow
 */
		dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["upsert"], dataToSend: ["autoMapInputData"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Field ID
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
/**
 * A filter expression determines which items within the Scan results should be returned to you. All of the other results are discarded. Empty value will return all Scan results.
 * @displayOptions.show { scan: [true] }
 */
		filterExpression?: string | Expression<string>;
};

/** Delete an item */
export type AwsDynamoDbV1ItemDeleteConfig = {
	resource: 'item';
	operation: 'delete';
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"] }
 * @default []
 */
		tableName: string | Expression<string>;
/**
 * Use ReturnValues if you want to get the item attributes as they appeared before they were deleted
 * @displayOptions.show { resource: ["item"], operation: ["delete"] }
 * @default NONE
 */
		returnValues?: 'ALL_OLD' | 'NONE' | Expression<string>;
/**
 * Item's primary key. For example, with a simple primary key, you only need to provide a value for the partition key. For a composite primary key, you must provide values for both the partition key and the sort key.
 * @displayOptions.show { resource: ["item"], operation: ["delete"] }
 * @default {}
 */
		keysUi?: {
		keyValues?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Type
			 * @default S
			 */
			type?: 'B' | 'N' | 'S' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["delete"], returnValues: ["ALL_OLD"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * A filter expression determines which items within the Scan results should be returned to you. All of the other results are discarded. Empty value will return all Scan results.
 * @displayOptions.show { scan: [true] }
 */
		filterExpression?: string | Expression<string>;
};

/** Get an item */
export type AwsDynamoDbV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"] }
 * @default []
 */
		tableName: string | Expression<string>;
	select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["get"], select: ["ALL_PROJECTED_ATTRIBUTES", "ALL_ATTRIBUTES"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
/**
 * Item's primary key. For example, with a simple primary key, you only need to provide a value for the partition key. For a composite primary key, you must provide values for both the partition key and the sort key.
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 * @default {}
 */
		keysUi?: {
		keyValues?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Type
			 * @default S
			 */
			type?: 'B' | 'N' | 'S' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
/**
 * A filter expression determines which items within the Scan results should be returned to you. All of the other results are discarded. Empty value will return all Scan results.
 * @displayOptions.show { scan: [true] }
 */
		filterExpression?: string | Expression<string>;
};

/** Get many items */
export type AwsDynamoDbV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"] }
 * @default []
 */
		tableName: string | Expression<string>;
/**
 * Whether to do an scan or query. Check &lt;a href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html" &gt;differences&lt;/a&gt;.
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default false
 */
		scan?: boolean | Expression<boolean>;
/**
 * A filter expression determines which items within the Scan results should be returned to you. All of the other results are discarded. Empty value will return all Scan results.
 * @displayOptions.show { scan: [true] }
 */
		filterExpression?: string | Expression<string>;
/**
 * Condition to determine the items to be retrieved. The condition must perform an equality test on a single partition key value, in this format: &lt;code&gt;partitionKeyName = :partitionkeyval&lt;/code&gt;
 * @displayOptions.show { resource: ["item"], operation: ["getAll"], scan: [false] }
 */
		keyConditionExpression: string | Expression<string>;
/**
 * Substitution tokens for attribute names in an expression
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default {}
 */
		eavUi: {
		eavValues?: Array<{
			/** Attribute
			 */
			attribute?: string | Expression<string>;
			/** Type
			 * @default S
			 */
			type?: 'N' | 'S' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'COUNT' | 'SPECIFIC_ATTRIBUTES' | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["getAll"], select: ["ALL_PROJECTED_ATTRIBUTES", "ALL_ATTRIBUTES", "SPECIFIC_ATTRIBUTES"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AwsDynamoDbV1Params =
	| AwsDynamoDbV1ItemUpsertConfig
	| AwsDynamoDbV1ItemDeleteConfig
	| AwsDynamoDbV1ItemGetConfig
	| AwsDynamoDbV1ItemGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsDynamoDbV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsDynamoDbV1Node = {
	type: 'n8n-nodes-base.awsDynamoDb';
	version: 1;
	config: NodeConfig<AwsDynamoDbV1Params>;
	credentials?: AwsDynamoDbV1Credentials;
};