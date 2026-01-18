/**
 * MISP Node Types
 *
 * Consume the MISP API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/misp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MispV1AttributeCreateConfig = {
	resource: 'attribute';
	operation: 'create';
	/**
	 * UUID of the event to attach the attribute to
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
	 */
	attributeId: string | Expression<string>;
};

export type MispV1AttributeGetConfig = {
	resource: 'attribute';
	operation: 'get';
	/**
	 * UUID or numeric ID of the attribute
	 */
	attributeId: string | Expression<string>;
};

export type MispV1AttributeGetAllConfig = {
	resource: 'attribute';
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

export type MispV1AttributeSearchConfig = {
	resource: 'attribute';
	operation: 'search';
	/**
	 * Whether to use JSON to specify the fields for the search request
	 * @default false
	 */
	useJson?: boolean | Expression<boolean>;
	/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
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
	 */
	attributeId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1EventCreateConfig = {
	resource: 'event';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	org_id: string | Expression<string>;
	/**
	 * Information on the event - max 65535 characters
	 */
	information: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1EventDeleteConfig = {
	resource: 'event';
	operation: 'delete';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
};

export type MispV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
};

export type MispV1EventGetAllConfig = {
	resource: 'event';
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

export type MispV1EventPublishConfig = {
	resource: 'event';
	operation: 'publish';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
};

export type MispV1EventSearchConfig = {
	resource: 'event';
	operation: 'search';
	/**
	 * Whether to use JSON to specify the fields for the search request
	 * @default false
	 */
	useJson?: boolean | Expression<boolean>;
	/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
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
	 */
	eventId: string | Expression<string>;
};

export type MispV1EventUpdateConfig = {
	resource: 'event';
	operation: 'update';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1EventTagAddConfig = {
	resource: 'eventTag';
	operation: 'add';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tagId: string | Expression<string>;
};

export type MispV1EventTagRemoveConfig = {
	resource: 'eventTag';
	operation: 'remove';
	/**
	 * UUID or numeric ID of the event
	 */
	eventId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	feedId: string | Expression<string>;
};

export type MispV1FeedEnableConfig = {
	resource: 'feed';
	operation: 'enable';
	/**
	 * UUID or numeric ID of the feed
	 */
	feedId: string | Expression<string>;
};

export type MispV1FeedGetConfig = {
	resource: 'feed';
	operation: 'get';
	/**
	 * UUID or numeric ID of the feed
	 */
	feedId: string | Expression<string>;
};

export type MispV1FeedGetAllConfig = {
	resource: 'feed';
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

export type MispV1FeedUpdateConfig = {
	resource: 'feed';
	operation: 'update';
	/**
	 * ID of the feed to update
	 */
	feedId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1GalaxyDeleteConfig = {
	resource: 'galaxy';
	operation: 'delete';
	/**
	 * UUID or numeric ID of the galaxy
	 */
	galaxyId: string | Expression<string>;
};

export type MispV1GalaxyGetConfig = {
	resource: 'galaxy';
	operation: 'get';
	/**
	 * UUID or numeric ID of the galaxy
	 */
	galaxyId: string | Expression<string>;
};

export type MispV1GalaxyGetAllConfig = {
	resource: 'galaxy';
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

export type MispV1NoticelistGetConfig = {
	resource: 'noticelist';
	operation: 'get';
	/**
	 * Numeric ID of the noticelist
	 */
	noticelistId: string | Expression<string>;
};

export type MispV1NoticelistGetAllConfig = {
	resource: 'noticelist';
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

export type MispV1ObjectSearchConfig = {
	resource: 'object';
	operation: 'search';
	/**
	 * Whether to use JSON to specify the fields for the search request
	 * @default false
	 */
	useJson?: boolean | Expression<boolean>;
	/**
 * Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes
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
	 */
	organisationId: string | Expression<string>;
};

export type MispV1OrganisationGetConfig = {
	resource: 'organisation';
	operation: 'get';
	/**
	 * UUID or numeric ID of the organisation
	 */
	organisationId: string | Expression<string>;
};

export type MispV1OrganisationGetAllConfig = {
	resource: 'organisation';
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

export type MispV1OrganisationUpdateConfig = {
	resource: 'organisation';
	operation: 'update';
	/**
	 * ID of the organisation to update
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
	 */
	tagId: string | Expression<string>;
};

export type MispV1TagGetAllConfig = {
	resource: 'tag';
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

export type MispV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
	/**
	 * ID of the tag to update
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
	 */
	role_id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MispV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * Numeric ID of the user
	 */
	userId: string | Expression<string>;
};

export type MispV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Numeric ID of the user
	 */
	userId: string | Expression<string>;
};

export type MispV1UserGetAllConfig = {
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

export type MispV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * ID of the user to update
	 */
	userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MispV1WarninglistGetConfig = {
	resource: 'warninglist';
	operation: 'get';
	/**
	 * Numeric ID of the warninglist
	 */
	warninglistId: string | Expression<string>;
};

export type MispV1WarninglistGetAllConfig = {
	resource: 'warninglist';
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
	| MispV1WarninglistGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MispV1Credentials {
	mispApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MispNode = {
	type: 'n8n-nodes-base.misp';
	version: 1;
	config: NodeConfig<MispV1Params>;
	credentials?: MispV1Credentials;
};
