/**
 * Grafana Node - Version 1
 * Consume the Grafana API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a dashboard */
export type GrafanaV1DashboardCreateConfig = {
	resource: 'dashboard';
	operation: 'create';
/**
 * Title of the dashboard to create
 * @displayOptions.show { resource: ["dashboard"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["dashboard"], operation: ["delete"] }
 */
		dashboardUidOrUrl: string | Expression<string>;
};

/** Get a dashboard */
export type GrafanaV1DashboardGetConfig = {
	resource: 'dashboard';
	operation: 'get';
/**
 * Unique alphabetic identifier or URL of the dashboard to retrieve
 * @displayOptions.show { resource: ["dashboard"], operation: ["get"] }
 */
		dashboardUidOrUrl: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1DashboardGetAllConfig = {
	resource: 'dashboard';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["dashboard"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["dashboard"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["dashboard"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["team"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["team"], operation: ["delete"] }
 */
		teamId: string | Expression<string>;
};

/** Get a dashboard */
export type GrafanaV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
/**
 * ID of the team to retrieve
 * @displayOptions.show { resource: ["team"], operation: ["get"] }
 */
		teamId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1TeamGetAllConfig = {
	resource: 'team';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["team"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["team"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["team"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["teamMember"], operation: ["add"] }
 */
		userId: string | Expression<string>;
/**
 * Team to add the user to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["teamMember"], operation: ["add"] }
 */
		teamId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1TeamMemberGetAllConfig = {
	resource: 'teamMember';
	operation: 'getAll';
/**
 * Team to retrieve all members from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["teamMember"], operation: ["getAll"] }
 */
		teamId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["teamMember"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["teamMember"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["teamMember"], operation: ["remove"] }
 */
		memberId: string | Expression<string>;
/**
 * Team to remove the user from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["teamMember"], operation: ["remove"] }
 */
		teamId: string | Expression<string>;
};

/** Delete a dashboard */
export type GrafanaV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * ID of the user to delete
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		userId: string | Expression<string>;
};

/** Get many dashboards */
export type GrafanaV1UserGetAllConfig = {
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

/** Update a dashboard */
export type GrafanaV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * ID of the user to update
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
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
	| GrafanaV1UserUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type GrafanaV1DashboardGetOutput = {
	dashboard?: {
		annotations?: {
			list?: Array<{
				builtIn?: number;
				datasource?: {
					type?: string;
					uid?: string;
				};
				enable?: boolean;
				hide?: boolean;
				iconColor?: string;
				name?: string;
				target?: {
					limit?: number;
					matchAny?: boolean;
					type?: string;
				};
				type?: string;
			}>;
		};
		editable?: boolean;
		fiscalYearStartMonth?: number;
		graphTooltip?: number;
		id?: number;
		links?: Array<{
			asDropdown?: boolean;
			icon?: string;
			includeVars?: boolean;
			keepTime?: boolean;
			targetBlank?: boolean;
			title?: string;
			tooltip?: string;
			type?: string;
			url?: string;
		}>;
		panels?: Array<{
			datasource?: {
				type?: string;
				uid?: string;
			};
			description?: string;
			fieldConfig?: {
				defaults?: {
					color?: {
						fixedColor?: string;
						mode?: string;
					};
					custom?: {
						axisBorderShow?: boolean;
						axisCenteredZero?: boolean;
						axisColorMode?: string;
						axisGridShow?: boolean;
						axisLabel?: string;
						axisPlacement?: string;
						barAlignment?: number;
						barWidthFactor?: number;
						drawStyle?: string;
						fillOpacity?: number;
						gradientMode?: string;
						hideFrom?: {
							legend?: boolean;
							tooltip?: boolean;
							viz?: boolean;
						};
						insertNulls?: boolean;
						lineInterpolation?: string;
						lineStyle?: {
							fill?: string;
						};
						lineWidth?: number;
						pointSize?: number;
						scaleDistribution?: {
							type?: string;
						};
						showPoints?: string;
						spanNulls?: boolean;
						stacking?: {
							group?: string;
							mode?: string;
						};
						thresholdsStyle?: {
							mode?: string;
						};
					};
					min?: number;
					thresholds?: {
						mode?: string;
						steps?: Array<{
							color?: string;
						}>;
					};
					unit?: string;
				};
				overrides?: Array<{
					matcher?: {
						id?: string;
						options?: string;
					};
					properties?: Array<{
						id?: string;
					}>;
				}>;
			};
			gridPos?: {
				h?: number;
				w?: number;
				x?: number;
				y?: number;
			};
			id?: number;
			interval?: string;
			options?: {
				legend?: {
					calcs?: Array<string>;
					displayMode?: string;
					placement?: string;
					showLegend?: boolean;
				};
				tooltip?: {
					mode?: string;
					sort?: string;
				};
			};
			pluginVersion?: string;
			targets?: Array<{
				datasource?: {
					type?: string;
					uid?: string;
				};
				disableTextWrap?: boolean;
				editorMode?: string;
				expr?: string;
				format?: string;
				fullMetaSearch?: boolean;
				hide?: boolean;
				includeNullMetadata?: boolean;
				instant?: boolean;
				interval?: string;
				intervalFactor?: number;
				legendFormat?: string;
				refId?: string;
				useBackend?: boolean;
			}>;
			title?: string;
			transparent?: boolean;
			type?: string;
		}>;
		preload?: boolean;
		schemaVersion?: number;
		tags?: Array<string>;
		templating?: {
			list?: Array<{
				current?: {
					selected?: boolean;
				};
				datasource?: {
					type?: string;
					uid?: string;
				};
				definition?: string;
				hide?: number;
				includeAll?: boolean;
				label?: string;
				multi?: boolean;
				name?: string;
				options?: Array<{
					selected?: boolean;
					text?: string;
					value?: string;
				}>;
				query?: {
					query?: string;
				};
				refresh?: number;
				regex?: string;
				skipUrlSync?: boolean;
				sort?: number;
				type?: string;
			}>;
		};
		time?: {
			from?: string;
			to?: string;
		};
		timezone?: string;
		title?: string;
		uid?: string;
		version?: number;
		weekStart?: string;
	};
	meta?: {
		annotationsPermissions?: {
			dashboard?: {
				canAdd?: boolean;
				canDelete?: boolean;
				canEdit?: boolean;
			};
			organization?: {
				canAdd?: boolean;
				canDelete?: boolean;
				canEdit?: boolean;
			};
		};
		canAdmin?: boolean;
		canDelete?: boolean;
		canEdit?: boolean;
		canSave?: boolean;
		canStar?: boolean;
		created?: string;
		createdBy?: string;
		expires?: string;
		folderId?: number;
		folderTitle?: string;
		folderUid?: string;
		folderUrl?: string;
		hasAcl?: boolean;
		isFolder?: boolean;
		provisioned?: boolean;
		provisionedExternalId?: string;
		slug?: string;
		type?: string;
		updated?: string;
		updatedBy?: string;
		url?: string;
		version?: number;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface GrafanaV1Credentials {
	grafanaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GrafanaV1NodeBase {
	type: 'n8n-nodes-base.grafana';
	version: 1;
	credentials?: GrafanaV1Credentials;
}

export type GrafanaV1DashboardCreateNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1DashboardCreateConfig>;
};

export type GrafanaV1DashboardDeleteNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1DashboardDeleteConfig>;
};

export type GrafanaV1DashboardGetNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1DashboardGetConfig>;
	output?: GrafanaV1DashboardGetOutput;
};

export type GrafanaV1DashboardGetAllNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1DashboardGetAllConfig>;
};

export type GrafanaV1DashboardUpdateNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1DashboardUpdateConfig>;
};

export type GrafanaV1TeamCreateNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamCreateConfig>;
};

export type GrafanaV1TeamDeleteNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamDeleteConfig>;
};

export type GrafanaV1TeamGetNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamGetConfig>;
};

export type GrafanaV1TeamGetAllNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamGetAllConfig>;
};

export type GrafanaV1TeamUpdateNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamUpdateConfig>;
};

export type GrafanaV1TeamMemberAddNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamMemberAddConfig>;
};

export type GrafanaV1TeamMemberGetAllNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamMemberGetAllConfig>;
};

export type GrafanaV1TeamMemberRemoveNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1TeamMemberRemoveConfig>;
};

export type GrafanaV1UserDeleteNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1UserDeleteConfig>;
};

export type GrafanaV1UserGetAllNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1UserGetAllConfig>;
};

export type GrafanaV1UserUpdateNode = GrafanaV1NodeBase & {
	config: NodeConfig<GrafanaV1UserUpdateConfig>;
};

export type GrafanaV1Node =
	| GrafanaV1DashboardCreateNode
	| GrafanaV1DashboardDeleteNode
	| GrafanaV1DashboardGetNode
	| GrafanaV1DashboardGetAllNode
	| GrafanaV1DashboardUpdateNode
	| GrafanaV1TeamCreateNode
	| GrafanaV1TeamDeleteNode
	| GrafanaV1TeamGetNode
	| GrafanaV1TeamGetAllNode
	| GrafanaV1TeamUpdateNode
	| GrafanaV1TeamMemberAddNode
	| GrafanaV1TeamMemberGetAllNode
	| GrafanaV1TeamMemberRemoveNode
	| GrafanaV1UserDeleteNode
	| GrafanaV1UserGetAllNode
	| GrafanaV1UserUpdateNode
	;