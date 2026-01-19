/**
 * MISP Node - Version 1
 * Consume the MISP API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MispV1AttributeCreateConfig = {
	resource: 'attribute';
	operation: 'create';
/**
 * UUID of the event to attach the attribute to
 * @displayOptions.show { resource: ["attribute"], operation: ["create"] }
 */
		eventId: string | Expression<string>;
	type: 'text' | 'url' | 'comment' | Expression<string>;
	value: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1AttributeDeleteConfig = {
	resource: 'attribute';
	operation: 'delete';
/**
 * UUID or numeric ID of the attribute
 * @displayOptions.show { resource: ["attribute"], operation: ["delete"] }
 */
		attributeId: string | Expression<string>;
};

export type MispV1AttributeGetConfig = {
	resource: 'attribute';
	operation: 'get';
/**
 * UUID or numeric ID of the attribute
 * @displayOptions.show { resource: ["attribute"], operation: ["get"] }
 */
		attributeId: string | Expression<string>;
};

export type MispV1AttributeGetAllConfig = {
	resource: 'attribute';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["attribute"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["attribute"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1AttributeSearchConfig = {
	resource: 'attribute';
	operation: 'search';
/**
 * Whether to use JSON to specify the fields for the search request
 * @displayOptions.show { resource: ["attribute"], operation: ["search"] }
 * @default false
 */
		useJson?: boolean | Expression<boolean>;
/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
 * @displayOptions.show { useJson: [true], resource: ["attribute"], operation: ["search"] }
 * @default {
  "value": "search value",
  "type": "text"
}

 */
		jsonOutput?: IDataObject | string | Expression<string>;
	value: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1AttributeUpdateConfig = {
	resource: 'attribute';
	operation: 'update';
/**
 * ID of the attribute to update
 * @displayOptions.show { resource: ["attribute"], operation: ["update"] }
 */
		attributeId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["event"], operation: ["create"] }
 */
		org_id: string | Expression<string>;
/**
 * Information on the event - max 65535 characters
 * @displayOptions.show { resource: ["event"], operation: ["create"] }
 */
		information: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1EventDeleteConfig = {
	resource: 'event';
	operation: 'delete';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["event"], operation: ["delete"] }
 */
		eventId: string | Expression<string>;
};

export type MispV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["event"], operation: ["get"] }
 */
		eventId: string | Expression<string>;
};

export type MispV1EventGetAllConfig = {
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
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1EventPublishConfig = {
	resource: 'event';
	operation: 'publish';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["event"], operation: ["publish"] }
 */
		eventId: string | Expression<string>;
};

export type MispV1EventSearchConfig = {
	resource: 'event';
	operation: 'search';
/**
 * Whether to use JSON to specify the fields for the search request
 * @displayOptions.show { resource: ["event"], operation: ["search"] }
 * @default false
 */
		useJson?: boolean | Expression<boolean>;
/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
 * @displayOptions.show { useJson: [true], resource: ["event"], operation: ["search"] }
 * @default {
  "value": "search value",
  "type": "text"
}

 */
		jsonOutput?: IDataObject | string | Expression<string>;
	value: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1EventUnpublishConfig = {
	resource: 'event';
	operation: 'unpublish';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["event"], operation: ["unpublish"] }
 */
		eventId: string | Expression<string>;
};

export type MispV1EventUpdateConfig = {
	resource: 'event';
	operation: 'update';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["event"], operation: ["update"] }
 */
		eventId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1EventTagAddConfig = {
	resource: 'eventTag';
	operation: 'add';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["eventTag"], operation: ["add"] }
 */
		eventId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["eventTag"], operation: ["add"] }
 */
		tagId: string | Expression<string>;
};

export type MispV1EventTagRemoveConfig = {
	resource: 'eventTag';
	operation: 'remove';
/**
 * UUID or numeric ID of the event
 * @displayOptions.show { resource: ["eventTag"], operation: ["remove"] }
 */
		eventId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["eventTag"], operation: ["remove"] }
 */
		tagId: string | Expression<string>;
};

export type MispV1FeedCreateConfig = {
	resource: 'feed';
	operation: 'create';
	name: string | Expression<string>;
	provider: string | Expression<string>;
	url: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1FeedDisableConfig = {
	resource: 'feed';
	operation: 'disable';
/**
 * UUID or numeric ID of the feed
 * @displayOptions.show { resource: ["feed"], operation: ["disable"] }
 */
		feedId: string | Expression<string>;
};

export type MispV1FeedEnableConfig = {
	resource: 'feed';
	operation: 'enable';
/**
 * UUID or numeric ID of the feed
 * @displayOptions.show { resource: ["feed"], operation: ["enable"] }
 */
		feedId: string | Expression<string>;
};

export type MispV1FeedGetConfig = {
	resource: 'feed';
	operation: 'get';
/**
 * UUID or numeric ID of the feed
 * @displayOptions.show { resource: ["feed"], operation: ["get"] }
 */
		feedId: string | Expression<string>;
};

export type MispV1FeedGetAllConfig = {
	resource: 'feed';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["feed"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["feed"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1FeedUpdateConfig = {
	resource: 'feed';
	operation: 'update';
/**
 * ID of the feed to update
 * @displayOptions.show { resource: ["feed"], operation: ["update"] }
 */
		feedId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1GalaxyDeleteConfig = {
	resource: 'galaxy';
	operation: 'delete';
/**
 * UUID or numeric ID of the galaxy
 * @displayOptions.show { resource: ["galaxy"], operation: ["delete"] }
 */
		galaxyId: string | Expression<string>;
};

export type MispV1GalaxyGetConfig = {
	resource: 'galaxy';
	operation: 'get';
/**
 * UUID or numeric ID of the galaxy
 * @displayOptions.show { resource: ["galaxy"], operation: ["get"] }
 */
		galaxyId: string | Expression<string>;
};

export type MispV1GalaxyGetAllConfig = {
	resource: 'galaxy';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["galaxy"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["galaxy"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1NoticelistGetConfig = {
	resource: 'noticelist';
	operation: 'get';
/**
 * Numeric ID of the noticelist
 * @displayOptions.show { resource: ["noticelist"], operation: ["get"] }
 */
		noticelistId: string | Expression<string>;
};

export type MispV1NoticelistGetAllConfig = {
	resource: 'noticelist';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["noticelist"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["noticelist"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1ObjectSearchConfig = {
	resource: 'object';
	operation: 'search';
/**
 * Whether to use JSON to specify the fields for the search request
 * @displayOptions.show { resource: ["object"], operation: ["search"] }
 * @default false
 */
		useJson?: boolean | Expression<boolean>;
/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
 * @displayOptions.show { useJson: [true], resource: ["object"], operation: ["search"] }
 * @default {
  "value": "search value",
  "type": "text"
}

 */
		jsonOutput?: IDataObject | string | Expression<string>;
	value: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1OrganisationCreateConfig = {
	resource: 'organisation';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1OrganisationDeleteConfig = {
	resource: 'organisation';
	operation: 'delete';
/**
 * UUID or numeric ID of the organisation
 * @displayOptions.show { resource: ["organisation"], operation: ["delete"] }
 */
		organisationId: string | Expression<string>;
};

export type MispV1OrganisationGetConfig = {
	resource: 'organisation';
	operation: 'get';
/**
 * UUID or numeric ID of the organisation
 * @displayOptions.show { resource: ["organisation"], operation: ["get"] }
 */
		organisationId: string | Expression<string>;
};

export type MispV1OrganisationGetAllConfig = {
	resource: 'organisation';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["organisation"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["organisation"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1OrganisationUpdateConfig = {
	resource: 'organisation';
	operation: 'update';
/**
 * ID of the organisation to update
 * @displayOptions.show { resource: ["organisation"], operation: ["update"] }
 */
		organisationId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
/**
 * Numeric ID of the attribute
 * @displayOptions.show { resource: ["tag"], operation: ["delete"] }
 */
		tagId: string | Expression<string>;
};

export type MispV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["tag"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["tag"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
/**
 * ID of the tag to update
 * @displayOptions.show { resource: ["tag"], operation: ["update"] }
 */
		tagId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	email: string | Expression<string>;
/**
 * Role IDs are available in the MISP dashboard at /roles/index
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		role_id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * Numeric ID of the user
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		userId: string | Expression<string>;
};

export type MispV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Numeric ID of the user
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		userId: string | Expression<string>;
};

export type MispV1UserGetAllConfig = {
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

export type MispV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * ID of the user to update
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1WarninglistGetConfig = {
	resource: 'warninglist';
	operation: 'get';
/**
 * Numeric ID of the warninglist
 * @displayOptions.show { resource: ["warninglist"], operation: ["get"] }
 */
		warninglistId: string | Expression<string>;
};

export type MispV1WarninglistGetAllConfig = {
	resource: 'warninglist';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["warninglist"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["warninglist"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type MispV1Params =
	| MispV1AttributeCreateConfig
	| MispV1AttributeDeleteConfig
	| MispV1AttributeGetConfig
	| MispV1AttributeGetAllConfig
	| MispV1AttributeSearchConfig
	| MispV1AttributeUpdateConfig
	| MispV1EventCreateConfig
	| MispV1EventDeleteConfig
	| MispV1EventGetConfig
	| MispV1EventGetAllConfig
	| MispV1EventPublishConfig
	| MispV1EventSearchConfig
	| MispV1EventUnpublishConfig
	| MispV1EventUpdateConfig
	| MispV1EventTagAddConfig
	| MispV1EventTagRemoveConfig
	| MispV1FeedCreateConfig
	| MispV1FeedDisableConfig
	| MispV1FeedEnableConfig
	| MispV1FeedGetConfig
	| MispV1FeedGetAllConfig
	| MispV1FeedUpdateConfig
	| MispV1GalaxyDeleteConfig
	| MispV1GalaxyGetConfig
	| MispV1GalaxyGetAllConfig
	| MispV1NoticelistGetConfig
	| MispV1NoticelistGetAllConfig
	| MispV1ObjectSearchConfig
	| MispV1OrganisationCreateConfig
	| MispV1OrganisationDeleteConfig
	| MispV1OrganisationGetConfig
	| MispV1OrganisationGetAllConfig
	| MispV1OrganisationUpdateConfig
	| MispV1TagCreateConfig
	| MispV1TagDeleteConfig
	| MispV1TagGetAllConfig
	| MispV1TagUpdateConfig
	| MispV1UserCreateConfig
	| MispV1UserDeleteConfig
	| MispV1UserGetConfig
	| MispV1UserGetAllConfig
	| MispV1UserUpdateConfig
	| MispV1WarninglistGetConfig
	| MispV1WarninglistGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MispV1Credentials {
	mispApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MispV1NodeBase {
	type: 'n8n-nodes-base.misp';
	version: 1;
	credentials?: MispV1Credentials;
}

export type MispV1AttributeCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeCreateConfig>;
};

export type MispV1AttributeDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeDeleteConfig>;
};

export type MispV1AttributeGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeGetConfig>;
};

export type MispV1AttributeGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeGetAllConfig>;
};

export type MispV1AttributeSearchNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeSearchConfig>;
};

export type MispV1AttributeUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1AttributeUpdateConfig>;
};

export type MispV1EventCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventCreateConfig>;
};

export type MispV1EventDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventDeleteConfig>;
};

export type MispV1EventGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventGetConfig>;
};

export type MispV1EventGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventGetAllConfig>;
};

export type MispV1EventPublishNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventPublishConfig>;
};

export type MispV1EventSearchNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventSearchConfig>;
};

export type MispV1EventUnpublishNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventUnpublishConfig>;
};

export type MispV1EventUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventUpdateConfig>;
};

export type MispV1EventTagAddNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventTagAddConfig>;
};

export type MispV1EventTagRemoveNode = MispV1NodeBase & {
	config: NodeConfig<MispV1EventTagRemoveConfig>;
};

export type MispV1FeedCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedCreateConfig>;
};

export type MispV1FeedDisableNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedDisableConfig>;
};

export type MispV1FeedEnableNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedEnableConfig>;
};

export type MispV1FeedGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedGetConfig>;
};

export type MispV1FeedGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedGetAllConfig>;
};

export type MispV1FeedUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1FeedUpdateConfig>;
};

export type MispV1GalaxyDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1GalaxyDeleteConfig>;
};

export type MispV1GalaxyGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1GalaxyGetConfig>;
};

export type MispV1GalaxyGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1GalaxyGetAllConfig>;
};

export type MispV1NoticelistGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1NoticelistGetConfig>;
};

export type MispV1NoticelistGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1NoticelistGetAllConfig>;
};

export type MispV1ObjectSearchNode = MispV1NodeBase & {
	config: NodeConfig<MispV1ObjectSearchConfig>;
};

export type MispV1OrganisationCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1OrganisationCreateConfig>;
};

export type MispV1OrganisationDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1OrganisationDeleteConfig>;
};

export type MispV1OrganisationGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1OrganisationGetConfig>;
};

export type MispV1OrganisationGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1OrganisationGetAllConfig>;
};

export type MispV1OrganisationUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1OrganisationUpdateConfig>;
};

export type MispV1TagCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1TagCreateConfig>;
};

export type MispV1TagDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1TagDeleteConfig>;
};

export type MispV1TagGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1TagGetAllConfig>;
};

export type MispV1TagUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1TagUpdateConfig>;
};

export type MispV1UserCreateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1UserCreateConfig>;
};

export type MispV1UserDeleteNode = MispV1NodeBase & {
	config: NodeConfig<MispV1UserDeleteConfig>;
};

export type MispV1UserGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1UserGetConfig>;
};

export type MispV1UserGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1UserGetAllConfig>;
};

export type MispV1UserUpdateNode = MispV1NodeBase & {
	config: NodeConfig<MispV1UserUpdateConfig>;
};

export type MispV1WarninglistGetNode = MispV1NodeBase & {
	config: NodeConfig<MispV1WarninglistGetConfig>;
};

export type MispV1WarninglistGetAllNode = MispV1NodeBase & {
	config: NodeConfig<MispV1WarninglistGetAllConfig>;
};

export type MispV1Node =
	| MispV1AttributeCreateNode
	| MispV1AttributeDeleteNode
	| MispV1AttributeGetNode
	| MispV1AttributeGetAllNode
	| MispV1AttributeSearchNode
	| MispV1AttributeUpdateNode
	| MispV1EventCreateNode
	| MispV1EventDeleteNode
	| MispV1EventGetNode
	| MispV1EventGetAllNode
	| MispV1EventPublishNode
	| MispV1EventSearchNode
	| MispV1EventUnpublishNode
	| MispV1EventUpdateNode
	| MispV1EventTagAddNode
	| MispV1EventTagRemoveNode
	| MispV1FeedCreateNode
	| MispV1FeedDisableNode
	| MispV1FeedEnableNode
	| MispV1FeedGetNode
	| MispV1FeedGetAllNode
	| MispV1FeedUpdateNode
	| MispV1GalaxyDeleteNode
	| MispV1GalaxyGetNode
	| MispV1GalaxyGetAllNode
	| MispV1NoticelistGetNode
	| MispV1NoticelistGetAllNode
	| MispV1ObjectSearchNode
	| MispV1OrganisationCreateNode
	| MispV1OrganisationDeleteNode
	| MispV1OrganisationGetNode
	| MispV1OrganisationGetAllNode
	| MispV1OrganisationUpdateNode
	| MispV1TagCreateNode
	| MispV1TagDeleteNode
	| MispV1TagGetAllNode
	| MispV1TagUpdateNode
	| MispV1UserCreateNode
	| MispV1UserDeleteNode
	| MispV1UserGetNode
	| MispV1UserGetAllNode
	| MispV1UserUpdateNode
	| MispV1WarninglistGetNode
	| MispV1WarninglistGetAllNode
	;