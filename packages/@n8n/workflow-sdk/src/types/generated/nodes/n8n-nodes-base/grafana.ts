/**
 * Grafana Node Types
 *
 * Consume the Grafana API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/grafana/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a dashboard */
export type GrafanaV1DashboardCreateConfig = {
	resource: 'dashboard';
	operation: 'create';
	/**
	 * Title of the dashboard to create
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a dashboard */
export type GrafanaV1DashboardDeleteConfig = {
	resource: 'dashboard';
	operation: 'delete';
	/**
	 * Unique alphabetic identifier or URL of the dashboard to delete
	 */
	dashboardUidOrUrl: string | Expression<string>;
};

/** Get a dashboard */
export type GrafanaV1DashboardGetConfig = {
	resource: 'dashboard';
	operation: 'get';
	/**
	 * Unique alphabetic identifier or URL of the dashboard to retrieve
	 */
	dashboardUidOrUrl: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1DashboardGetAllConfig = {
	resource: 'dashboard';
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
	filters?: Record<string, unknown>;
};

/** Update a dashboard */
export type GrafanaV1DashboardUpdateConfig = {
	resource: 'dashboard';
	operation: 'update';
	/**
	 * Unique alphabetic identifier or URL of the dashboard to update
	 */
	dashboardUidOrUrl: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a dashboard */
export type GrafanaV1TeamCreateConfig = {
	resource: 'team';
	operation: 'create';
	/**
	 * Name of the team to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a dashboard */
export type GrafanaV1TeamDeleteConfig = {
	resource: 'team';
	operation: 'delete';
	/**
	 * ID of the team to delete
	 */
	teamId: string | Expression<string>;
};

/** Get a dashboard */
export type GrafanaV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
	/**
	 * ID of the team to retrieve
	 */
	teamId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1TeamGetAllConfig = {
	resource: 'team';
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
	filters?: Record<string, unknown>;
};

/** Update a dashboard */
export type GrafanaV1TeamUpdateConfig = {
	resource: 'team';
	operation: 'update';
	/**
	 * ID of the team to update
	 */
	teamId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add a member to a team */
export type GrafanaV1TeamMemberAddConfig = {
	resource: 'teamMember';
	operation: 'add';
	/**
	 * User to add to a team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	userId: string | Expression<string>;
	/**
	 * Team to add the user to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1TeamMemberGetAllConfig = {
	resource: 'teamMember';
	operation: 'getAll';
	/**
	 * Team to retrieve all members from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamId: string | Expression<string>;
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

/** Remove a member from a team */
export type GrafanaV1TeamMemberRemoveConfig = {
	resource: 'teamMember';
	operation: 'remove';
	/**
	 * User to remove from the team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	memberId: string | Expression<string>;
	/**
	 * Team to remove the user from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	teamId: string | Expression<string>;
};

/** Delete a dashboard */
export type GrafanaV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * ID of the user to delete
	 */
	userId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1UserGetAllConfig = {
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

/** Update a dashboard */
export type GrafanaV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * ID of the user to update
	 */
	userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type GrafanaV1Params =
	| GrafanaV1DashboardCreateConfig
	| GrafanaV1DashboardDeleteConfig
	| GrafanaV1DashboardGetConfig
	| GrafanaV1DashboardGetAllConfig
	| GrafanaV1DashboardUpdateConfig
	| GrafanaV1TeamCreateConfig
	| GrafanaV1TeamDeleteConfig
	| GrafanaV1TeamGetConfig
	| GrafanaV1TeamGetAllConfig
	| GrafanaV1TeamUpdateConfig
	| GrafanaV1TeamMemberAddConfig
	| GrafanaV1TeamMemberGetAllConfig
	| GrafanaV1TeamMemberRemoveConfig
	| GrafanaV1UserDeleteConfig
	| GrafanaV1UserGetAllConfig
	| GrafanaV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GrafanaV1Credentials {
	grafanaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GrafanaV1Node = {
	type: 'n8n-nodes-base.grafana';
	version: 1;
	config: NodeConfig<GrafanaV1Params>;
	credentials?: GrafanaV1Credentials;
};

export type GrafanaNode = GrafanaV1Node;
