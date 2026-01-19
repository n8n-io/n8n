/**
 * LoneScale Node - Version 1
 * Create List, add / delete items
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Manipulate list */
export type LoneScaleV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * Name of your list
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		name: string | Expression<string>;
/**
 * Type of your list
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 * @default COMPANY
 */
		type: 'COMPANY' | 'PEOPLE' | Expression<string>;
};

/** Manipulate item */
export type LoneScaleV1ItemAddConfig = {
	resource: 'item';
	operation: 'add';
/**
 * Type of your list
 * @displayOptions.show { resource: ["item"] }
 * @default PEOPLE
 */
		type: 'COMPANY' | 'PEOPLE' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["item"] }
 */
		list: string | Expression<string>;
/**
 * Contact first name
 * @displayOptions.show { operation: ["add"], resource: ["item"], type: ["PEOPLE"] }
 */
		first_name: string | Expression<string>;
/**
 * Contact last name
 * @displayOptions.show { operation: ["add"], resource: ["item"], type: ["PEOPLE"] }
 */
		last_name: string | Expression<string>;
/**
 * Contact company name
 * @displayOptions.show { operation: ["add"], resource: ["item"], type: ["COMPANY"] }
 */
		company_name?: string | Expression<string>;
	peopleAdditionalFields?: Record<string, unknown>;
	companyAdditionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LoneScaleV1Credentials {
	loneScaleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LoneScaleV1NodeBase {
	type: 'n8n-nodes-base.loneScale';
	version: 1;
	credentials?: LoneScaleV1Credentials;
}

export type LoneScaleV1ListCreateNode = LoneScaleV1NodeBase & {
	config: NodeConfig<LoneScaleV1ListCreateConfig>;
};

export type LoneScaleV1ItemAddNode = LoneScaleV1NodeBase & {
	config: NodeConfig<LoneScaleV1ItemAddConfig>;
};

export type LoneScaleV1Node =
	| LoneScaleV1ListCreateNode
	| LoneScaleV1ItemAddNode
	;