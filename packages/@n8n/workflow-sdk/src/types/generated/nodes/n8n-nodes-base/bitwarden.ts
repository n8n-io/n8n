/**
 * Bitwarden Node Types
 *
 * Consume the Bitwarden API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/bitwarden/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type BitwardenV1CollectionDeleteConfig = {
	resource: 'collection';
	operation: 'delete';
	/**
	 * The identifier of the collection
	 */
	collectionId: string | Expression<string>;
};

export type BitwardenV1CollectionGetConfig = {
	resource: 'collection';
	operation: 'get';
	/**
	 * The identifier of the collection
	 */
	collectionId: string | Expression<string>;
};

export type BitwardenV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type BitwardenV1CollectionUpdateConfig = {
	resource: 'collection';
	operation: 'update';
	/**
	 * The identifier of the collection
	 */
	collectionId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type BitwardenV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type BitwardenV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	/**
	 * The name of the group to create
	 */
	name: string | Expression<string>;
	/**
	 * Whether to allow this group to access all collections within the organization, instead of only its associated collections. If set to true, this option overrides any collection assignments.
	 * @default false
	 */
	accessAll?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type BitwardenV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
	/**
	 * The identifier of the group
	 */
	groupId: string | Expression<string>;
};

export type BitwardenV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
	/**
	 * The identifier of the group
	 */
	groupId: string | Expression<string>;
};

export type BitwardenV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type BitwardenV1GroupGetMembersConfig = {
	resource: 'group';
	operation: 'getMembers';
	/**
	 * The identifier of the group
	 */
	groupId: string | Expression<string>;
};

export type BitwardenV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
	/**
	 * The identifier of the group
	 */
	groupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type BitwardenV1GroupUpdateMembersConfig = {
	resource: 'group';
	operation: 'updateMembers';
	/**
	 * The identifier of the group
	 */
	groupId: string | Expression<string>;
	/**
	 * Comma-separated list of IDs of members to set in a group
	 */
	memberIds?: string | Expression<string>;
};

export type BitwardenV1MemberCreateConfig = {
	resource: 'member';
	operation: 'create';
	type: 0 | 1 | 2 | 3 | Expression<number>;
	/**
	 * The email of the member to update
	 */
	email?: string | Expression<string>;
	accessAll?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type BitwardenV1MemberDeleteConfig = {
	resource: 'member';
	operation: 'delete';
	/**
	 * The identifier of the member
	 */
	memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
	/**
	 * The identifier of the member
	 */
	memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetGroupsConfig = {
	resource: 'member';
	operation: 'getGroups';
	/**
	 * The identifier of the member
	 */
	memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type BitwardenV1MemberUpdateConfig = {
	resource: 'member';
	operation: 'update';
	/**
	 * The identifier of the member
	 */
	memberId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type BitwardenV1MemberUpdateGroupsConfig = {
	resource: 'member';
	operation: 'updateGroups';
	/**
	 * The identifier of the member
	 */
	memberId: string | Expression<string>;
	/**
	 * Comma-separated list of IDs of groups to set for a member
	 */
	groupIds?: string | Expression<string>;
};

export type BitwardenV1Params =
	| BitwardenV1CollectionDeleteConfig
	| BitwardenV1CollectionGetConfig
	| BitwardenV1CollectionGetAllConfig
	| BitwardenV1CollectionUpdateConfig
	| BitwardenV1EventGetAllConfig
	| BitwardenV1GroupCreateConfig
	| BitwardenV1GroupDeleteConfig
	| BitwardenV1GroupGetConfig
	| BitwardenV1GroupGetAllConfig
	| BitwardenV1GroupGetMembersConfig
	| BitwardenV1GroupUpdateConfig
	| BitwardenV1GroupUpdateMembersConfig
	| BitwardenV1MemberCreateConfig
	| BitwardenV1MemberDeleteConfig
	| BitwardenV1MemberGetConfig
	| BitwardenV1MemberGetGroupsConfig
	| BitwardenV1MemberGetAllConfig
	| BitwardenV1MemberUpdateConfig
	| BitwardenV1MemberUpdateGroupsConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BitwardenV1Credentials {
	bitwardenApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BitwardenV1Node = {
	type: 'n8n-nodes-base.bitwarden';
	version: 1;
	config: NodeConfig<BitwardenV1Params>;
	credentials?: BitwardenV1Credentials;
};

export type BitwardenNode = BitwardenV1Node;
