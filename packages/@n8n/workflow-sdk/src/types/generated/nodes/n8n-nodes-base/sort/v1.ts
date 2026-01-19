/**
 * Sort Node - Version 1
 * Change items order
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SortV1Config {
/**
 * The type of sorting to perform
 * @default simple
 */
		type?: 'simple' | 'random' | 'code' | Expression<string>;
/**
 * The fields of the input items to sort by
 * @displayOptions.show { type: ["simple"] }
 * @default {}
 */
		sortFieldsUi?: {
		sortField?: Array<{
			/** The field to sort by
			 * @hint  Enter the field name as text
			 */
			fieldName?: string | Expression<string>;
			/** The order to sort by
			 * @default ascending
			 */
			order?: 'ascending' | 'descending' | Expression<string>;
		}>;
	};
/**
 * Javascript code to determine the order of any two items
 * @displayOptions.show { type: ["code"] }
 * @default // The two items to compare are in the variables a and b
	// Access the fields in a.json and b.json
	// Return -1 if a should go before b
	// Return 1 if b should go before a
	// Return 0 if there's no difference

	fieldName = 'myField';

	if (a.json[fieldName] < b.json[fieldName]) {
	return -1;
	}
	if (a.json[fieldName] > b.json[fieldName]) {
	return 1;
	}
	return 0;
 */
		code?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface SortV1NodeBase {
	type: 'n8n-nodes-base.sort';
	version: 1;
}

export type SortV1Node = SortV1NodeBase & {
	config: NodeConfig<SortV1Config>;
};

export type SortV1Node = SortV1Node;