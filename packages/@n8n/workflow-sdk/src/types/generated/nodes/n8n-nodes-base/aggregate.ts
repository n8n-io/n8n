/**
 * Aggregate Node Types
 *
 * Combine a field from many items into a list in a single item
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/aggregate/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AggregateV1Params {
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData' | Expression<string>;
	fieldsToAggregate?: {
		fieldToAggregate?: Array<{
			fieldToAggregate?: string | Expression<string>;
			renameField?: boolean | Expression<boolean>;
			outputFieldName?: string | Expression<string>;
		}>;
	};
	/**
	 * The name of the output field to put the data in
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

export type AggregateV1Node = {
	type: 'n8n-nodes-base.aggregate';
	version: 1;
	config: NodeConfig<AggregateV1Params>;
	credentials?: Record<string, never>;
};

export type AggregateNode = AggregateV1Node;
