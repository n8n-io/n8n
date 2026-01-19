/**
 * Tapfiliate Node - Version 1
 * Consume Tapfiliate API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an affiliate */
export type TapfiliateV1AffiliateCreateConfig = {
	resource: 'affiliate';
	operation: 'create';
/**
 * The affiliate’s email
 * @displayOptions.show { operation: ["create"], resource: ["affiliate"] }
 */
		email: string | Expression<string>;
/**
 * The affiliate’s firstname
 * @displayOptions.show { operation: ["create"], resource: ["affiliate"] }
 */
		firstname: string | Expression<string>;
/**
 * The affiliate’s lastname
 * @displayOptions.show { operation: ["create"], resource: ["affiliate"] }
 */
		lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an affiliate */
export type TapfiliateV1AffiliateDeleteConfig = {
	resource: 'affiliate';
	operation: 'delete';
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["affiliate"], operation: ["delete"] }
 */
		affiliateId: string | Expression<string>;
};

/** Get an affiliate by ID */
export type TapfiliateV1AffiliateGetConfig = {
	resource: 'affiliate';
	operation: 'get';
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["affiliate"], operation: ["get"] }
 */
		affiliateId: string | Expression<string>;
};

/** Get many affiliates */
export type TapfiliateV1AffiliateGetAllConfig = {
	resource: 'affiliate';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["affiliate"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["affiliate"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Add metadata to affiliate */
export type TapfiliateV1AffiliateMetadataAddConfig = {
	resource: 'affiliateMetadata';
	operation: 'add';
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["add"] }
 */
		affiliateId: string | Expression<string>;
/**
 * Meta data
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["add"] }
 * @default {}
 */
		metadataUi?: {
		metadataValues?: Array<{
			/** Name of the metadata key to add
			 */
			key?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Remove metadata from affiliate */
export type TapfiliateV1AffiliateMetadataRemoveConfig = {
	resource: 'affiliateMetadata';
	operation: 'remove';
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["remove"] }
 */
		affiliateId: string | Expression<string>;
/**
 * Name of the metadata key to remove
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["remove"] }
 */
		key?: string | Expression<string>;
};

/** Update affiliate's metadata */
export type TapfiliateV1AffiliateMetadataUpdateConfig = {
	resource: 'affiliateMetadata';
	operation: 'update';
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["update"] }
 */
		affiliateId: string | Expression<string>;
/**
 * Name of the metadata key to update
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["update"] }
 */
		key?: string | Expression<string>;
/**
 * Value to set for the metadata key
 * @displayOptions.show { resource: ["affiliateMetadata"], operation: ["update"] }
 */
		value?: string | Expression<string>;
};

/** Add metadata to affiliate */
export type TapfiliateV1ProgramAffiliateAddConfig = {
	resource: 'programAffiliate';
	operation: 'add';
/**
 * The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add"], resource: ["programAffiliate"] }
 */
		programId: string | Expression<string>;
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["add"] }
 */
		affiliateId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Approve an affiliate for a program */
export type TapfiliateV1ProgramAffiliateApproveConfig = {
	resource: 'programAffiliate';
	operation: 'approve';
/**
 * The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["approve"], resource: ["programAffiliate"] }
 */
		programId?: string | Expression<string>;
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["approve"] }
 */
		affiliateId?: string | Expression<string>;
};

/** Disapprove an affiliate */
export type TapfiliateV1ProgramAffiliateDisapproveConfig = {
	resource: 'programAffiliate';
	operation: 'disapprove';
/**
 * The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["disapprove"], resource: ["programAffiliate"] }
 */
		programId?: string | Expression<string>;
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["disapprove"] }
 */
		affiliateId?: string | Expression<string>;
};

/** Get an affiliate by ID */
export type TapfiliateV1ProgramAffiliateGetConfig = {
	resource: 'programAffiliate';
	operation: 'get';
/**
 * The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"], resource: ["programAffiliate"] }
 */
		programId: string | Expression<string>;
/**
 * The ID of the affiliate
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["get"] }
 */
		affiliateId: string | Expression<string>;
};

/** Get many affiliates */
export type TapfiliateV1ProgramAffiliateGetAllConfig = {
	resource: 'programAffiliate';
	operation: 'getAll';
/**
 * The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["programAffiliate"] }
 */
		programId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["programAffiliate"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type TapfiliateV1Params =
	| TapfiliateV1AffiliateCreateConfig
	| TapfiliateV1AffiliateDeleteConfig
	| TapfiliateV1AffiliateGetConfig
	| TapfiliateV1AffiliateGetAllConfig
	| TapfiliateV1AffiliateMetadataAddConfig
	| TapfiliateV1AffiliateMetadataRemoveConfig
	| TapfiliateV1AffiliateMetadataUpdateConfig
	| TapfiliateV1ProgramAffiliateAddConfig
	| TapfiliateV1ProgramAffiliateApproveConfig
	| TapfiliateV1ProgramAffiliateDisapproveConfig
	| TapfiliateV1ProgramAffiliateGetConfig
	| TapfiliateV1ProgramAffiliateGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TapfiliateV1Credentials {
	tapfiliateApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TapfiliateV1NodeBase {
	type: 'n8n-nodes-base.tapfiliate';
	version: 1;
	credentials?: TapfiliateV1Credentials;
}

export type TapfiliateV1AffiliateCreateNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateCreateConfig>;
};

export type TapfiliateV1AffiliateDeleteNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateDeleteConfig>;
};

export type TapfiliateV1AffiliateGetNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateGetConfig>;
};

export type TapfiliateV1AffiliateGetAllNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateGetAllConfig>;
};

export type TapfiliateV1AffiliateMetadataAddNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateMetadataAddConfig>;
};

export type TapfiliateV1AffiliateMetadataRemoveNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateMetadataRemoveConfig>;
};

export type TapfiliateV1AffiliateMetadataUpdateNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1AffiliateMetadataUpdateConfig>;
};

export type TapfiliateV1ProgramAffiliateAddNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1ProgramAffiliateAddConfig>;
};

export type TapfiliateV1ProgramAffiliateApproveNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1ProgramAffiliateApproveConfig>;
};

export type TapfiliateV1ProgramAffiliateDisapproveNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1ProgramAffiliateDisapproveConfig>;
};

export type TapfiliateV1ProgramAffiliateGetNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1ProgramAffiliateGetConfig>;
};

export type TapfiliateV1ProgramAffiliateGetAllNode = TapfiliateV1NodeBase & {
	config: NodeConfig<TapfiliateV1ProgramAffiliateGetAllConfig>;
};

export type TapfiliateV1Node =
	| TapfiliateV1AffiliateCreateNode
	| TapfiliateV1AffiliateDeleteNode
	| TapfiliateV1AffiliateGetNode
	| TapfiliateV1AffiliateGetAllNode
	| TapfiliateV1AffiliateMetadataAddNode
	| TapfiliateV1AffiliateMetadataRemoveNode
	| TapfiliateV1AffiliateMetadataUpdateNode
	| TapfiliateV1ProgramAffiliateAddNode
	| TapfiliateV1ProgramAffiliateApproveNode
	| TapfiliateV1ProgramAffiliateDisapproveNode
	| TapfiliateV1ProgramAffiliateGetNode
	| TapfiliateV1ProgramAffiliateGetAllNode
	;