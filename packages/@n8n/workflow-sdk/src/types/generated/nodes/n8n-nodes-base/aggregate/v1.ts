/**
 * Aggregate Node - Version 1
 * Combine a field from many items into a list in a single item
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AggregateV1Config {
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData' | Expression<string>;
	fieldsToAggregate?: {
		fieldToAggregate?: Array<{
			/** The name of a field in the input items to aggregate together
			 * @hint  Enter the field name as text
			 */
			fieldToAggregate?: string | Expression<string>;
			/** Whether to give the field a different name in the output
			 * @default false
			 */
			renameField?: boolean | Expression<boolean>;
			/** The name of the field to put the aggregated data in. Leave blank to use the input field name.
			 * @displayOptions.show { renameField: [true] }
			 */
			outputFieldName?: string | Expression<string>;
		}>;
	};
/**
 * The name of the output field to put the data in
 * @displayOptions.show { aggregate: ["aggregateAllItemData"] }
 * @default data
 */
		destinationFieldName?: string | Expression<string>;
	include?: 'allFields' | 'specifiedFields' | 'allFieldsExcept' | Expression<string>;
	fieldsToExclude?: string | Expression<string>;
	fieldsToInclude?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface AggregateV1NodeBase {
	type: 'n8n-nodes-base.aggregate';
	version: 1;
}

export type AggregateV1Node = AggregateV1NodeBase & {
	config: NodeConfig<AggregateV1Config>;
};

export type AggregateV1Node = AggregateV1Node;