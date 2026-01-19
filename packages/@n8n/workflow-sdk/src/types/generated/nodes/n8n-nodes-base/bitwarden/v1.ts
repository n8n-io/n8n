/**
 * Bitwarden Node - Version 1
 * Consume the Bitwarden API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type BitwardenV1CollectionDeleteConfig = {
	resource: 'collection';
	operation: 'delete';
/**
 * The identifier of the collection
 * @displayOptions.show { resource: ["collection"], operation: ["delete", "get", "update"] }
 */
		collectionId: string | Expression<string>;
};

export type BitwardenV1CollectionGetConfig = {
	resource: 'collection';
	operation: 'get';
/**
 * The identifier of the collection
 * @displayOptions.show { resource: ["collection"], operation: ["delete", "get", "update"] }
 */
		collectionId: string | Expression<string>;
};

export type BitwardenV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type BitwardenV1CollectionUpdateConfig = {
	resource: 'collection';
	operation: 'update';
/**
 * The identifier of the collection
 * @displayOptions.show { resource: ["collection"], operation: ["delete", "get", "update"] }
 */
		collectionId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type BitwardenV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["event"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Whether to allow this group to access all collections within the organization, instead of only its associated collections. If set to true, this option overrides any collection assignments.
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["group"], operation: ["delete", "get", "getMembers", "update", "updateMembers"] }
 */
		groupId: string | Expression<string>;
};

export type BitwardenV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
/**
 * The identifier of the group
 * @displayOptions.show { resource: ["group"], operation: ["delete", "get", "getMembers", "update", "updateMembers"] }
 */
		groupId: string | Expression<string>;
};

export type BitwardenV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["group"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type BitwardenV1GroupGetMembersConfig = {
	resource: 'group';
	operation: 'getMembers';
/**
 * The identifier of the group
 * @displayOptions.show { resource: ["group"], operation: ["delete", "get", "getMembers", "update", "updateMembers"] }
 */
		groupId: string | Expression<string>;
};

export type BitwardenV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
/**
 * The identifier of the group
 * @displayOptions.show { resource: ["group"], operation: ["delete", "get", "getMembers", "update", "updateMembers"] }
 */
		groupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type BitwardenV1GroupUpdateMembersConfig = {
	resource: 'group';
	operation: 'updateMembers';
/**
 * The identifier of the group
 * @displayOptions.show { resource: ["group"], operation: ["delete", "get", "getMembers", "update", "updateMembers"] }
 */
		groupId: string | Expression<string>;
/**
 * Comma-separated list of IDs of members to set in a group
 * @displayOptions.show { resource: ["group"], operation: ["updateMembers"] }
 */
		memberIds?: string | Expression<string>;
};

export type BitwardenV1MemberCreateConfig = {
	resource: 'member';
	operation: 'create';
	type: 0 | 1 | 2 | 3 | Expression<number>;
/**
 * The email of the member to update
 * @displayOptions.show { resource: ["member"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["member"], operation: ["delete", "get", "getGroups", "update", "updateGroups"] }
 */
		memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
/**
 * The identifier of the member
 * @displayOptions.show { resource: ["member"], operation: ["delete", "get", "getGroups", "update", "updateGroups"] }
 */
		memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetGroupsConfig = {
	resource: 'member';
	operation: 'getGroups';
/**
 * The identifier of the member
 * @displayOptions.show { resource: ["member"], operation: ["delete", "get", "getGroups", "update", "updateGroups"] }
 */
		memberId: string | Expression<string>;
};

export type BitwardenV1MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["member"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type BitwardenV1MemberUpdateConfig = {
	resource: 'member';
	operation: 'update';
/**
 * The identifier of the member
 * @displayOptions.show { resource: ["member"], operation: ["delete", "get", "getGroups", "update", "updateGroups"] }
 */
		memberId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type BitwardenV1MemberUpdateGroupsConfig = {
	resource: 'member';
	operation: 'updateGroups';
/**
 * The identifier of the member
 * @displayOptions.show { resource: ["member"], operation: ["delete", "get", "getGroups", "update", "updateGroups"] }
 */
		memberId: string | Expression<string>;
/**
 * Comma-separated list of IDs of groups to set for a member
 * @displayOptions.show { resource: ["member"], operation: ["updateGroups"] }
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
	| BitwardenV1MemberUpdateGroupsConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type BitwardenV1MemberGetAllOutput = {
	collections?: null;
	email?: string;
	id?: string;
	name?: string;
	object?: string;
	permissions?: null;
	resetPasswordEnrolled?: boolean;
	ssoExternalId?: null;
	status?: number;
	twoFactorEnabled?: boolean;
	type?: number;
	userId?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface BitwardenV1Credentials {
	bitwardenApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BitwardenV1NodeBase {
	type: 'n8n-nodes-base.bitwarden';
	version: 1;
	credentials?: BitwardenV1Credentials;
}

export type BitwardenV1CollectionDeleteNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1CollectionDeleteConfig>;
};

export type BitwardenV1CollectionGetNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1CollectionGetConfig>;
};

export type BitwardenV1CollectionGetAllNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1CollectionGetAllConfig>;
};

export type BitwardenV1CollectionUpdateNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1CollectionUpdateConfig>;
};

export type BitwardenV1EventGetAllNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1EventGetAllConfig>;
};

export type BitwardenV1GroupCreateNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupCreateConfig>;
};

export type BitwardenV1GroupDeleteNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupDeleteConfig>;
};

export type BitwardenV1GroupGetNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupGetConfig>;
};

export type BitwardenV1GroupGetAllNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupGetAllConfig>;
};

export type BitwardenV1GroupGetMembersNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupGetMembersConfig>;
};

export type BitwardenV1GroupUpdateNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupUpdateConfig>;
};

export type BitwardenV1GroupUpdateMembersNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1GroupUpdateMembersConfig>;
};

export type BitwardenV1MemberCreateNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberCreateConfig>;
};

export type BitwardenV1MemberDeleteNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberDeleteConfig>;
};

export type BitwardenV1MemberGetNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberGetConfig>;
};

export type BitwardenV1MemberGetGroupsNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberGetGroupsConfig>;
};

export type BitwardenV1MemberGetAllNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberGetAllConfig>;
	output?: BitwardenV1MemberGetAllOutput;
};

export type BitwardenV1MemberUpdateNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberUpdateConfig>;
};

export type BitwardenV1MemberUpdateGroupsNode = BitwardenV1NodeBase & {
	config: NodeConfig<BitwardenV1MemberUpdateGroupsConfig>;
};

export type BitwardenV1Node =
	| BitwardenV1CollectionDeleteNode
	| BitwardenV1CollectionGetNode
	| BitwardenV1CollectionGetAllNode
	| BitwardenV1CollectionUpdateNode
	| BitwardenV1EventGetAllNode
	| BitwardenV1GroupCreateNode
	| BitwardenV1GroupDeleteNode
	| BitwardenV1GroupGetNode
	| BitwardenV1GroupGetAllNode
	| BitwardenV1GroupGetMembersNode
	| BitwardenV1GroupUpdateNode
	| BitwardenV1GroupUpdateMembersNode
	| BitwardenV1MemberCreateNode
	| BitwardenV1MemberDeleteNode
	| BitwardenV1MemberGetNode
	| BitwardenV1MemberGetGroupsNode
	| BitwardenV1MemberGetAllNode
	| BitwardenV1MemberUpdateNode
	| BitwardenV1MemberUpdateGroupsNode
	;