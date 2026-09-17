import type { BaseTextKey } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';

/**
 * The "Personal space" block of the instance role editor. Every user owns a
 * personal project, whatever their instance role grants, so the block is static:
 * two groups (view, manage) over the same six resources, all checked and disabled.
 */
export const PERSONAL_SPACE_GROUPS = ['view', 'manage'] as const;
export type PersonalSpaceGroup = (typeof PERSONAL_SPACE_GROUPS)[number];

/** Display order follows the design. */
export const PERSONAL_SPACE_RESOURCES = [
	'workflow',
	'credential',
	'dataTable',
	'agent',
	'folder',
	'execution',
] as const;
export type PersonalSpaceResource = (typeof PERSONAL_SPACE_RESOURCES)[number];

/**
 * The personal project owner scopes each row stands for. The block never
 * reads them; the unit test pins them against the `project:personalOwner` scopes,
 * so the block cannot claim an ability the personal owner role does not hold.
 */
export const PERSONAL_SPACE_ROW_SCOPES: Record<
	PersonalSpaceGroup,
	Record<PersonalSpaceResource, Scope[]>
> = {
	view: {
		workflow: ['workflow:read', 'workflow:list'],
		credential: ['credential:read', 'credential:list'],
		dataTable: ['dataTable:read', 'dataTable:readRow'],
		agent: ['agent:read', 'agent:list'],
		folder: ['folder:read', 'folder:list'],
		// Listing executions is gated on the read scope of their workflows.
		execution: ['workflow:read'],
	},
	manage: {
		workflow: [
			'workflow:create',
			'workflow:update',
			'workflow:delete',
			'workflow:execute',
			'workflow:move',
		],
		credential: ['credential:create', 'credential:update', 'credential:delete', 'credential:move'],
		dataTable: ['dataTable:create', 'dataTable:update', 'dataTable:delete', 'dataTable:writeRow'],
		agent: ['agent:create', 'agent:update', 'agent:delete', 'agent:execute'],
		folder: ['folder:create', 'folder:update', 'folder:delete', 'folder:move'],
		// Deleting executions is gated on workflow:execute; reveal shows redacted data.
		execution: ['workflow:execute', 'execution:reveal'],
	},
};

export const PERSONAL_SPACE_GROUP_LABEL_KEYS: Record<PersonalSpaceGroup, BaseTextKey> = {
	view: 'instanceRoles.personalSpace.view',
	manage: 'instanceRoles.personalSpace.manage',
};

/** Same resource names as the project role editor. */
export const PERSONAL_SPACE_RESOURCE_LABEL_KEYS: Record<PersonalSpaceResource, BaseTextKey> = {
	workflow: 'projectRoles.type.workflow',
	credential: 'projectRoles.type.credential',
	dataTable: 'projectRoles.type.dataTable',
	agent: 'projectRoles.type.agent',
	folder: 'projectRoles.type.folder',
	execution: 'projectRoles.type.execution',
};

export const PERSONAL_SPACE_TOOLTIP_KEYS: Record<
	PersonalSpaceGroup,
	Record<PersonalSpaceResource, BaseTextKey>
> = {
	view: {
		workflow: 'instanceRoles.personalSpace.view.workflow',
		credential: 'instanceRoles.personalSpace.view.credential',
		dataTable: 'instanceRoles.personalSpace.view.dataTable',
		agent: 'instanceRoles.personalSpace.view.agent',
		folder: 'instanceRoles.personalSpace.view.folder',
		execution: 'instanceRoles.personalSpace.view.execution',
	},
	manage: {
		workflow: 'instanceRoles.personalSpace.manage.workflow',
		credential: 'instanceRoles.personalSpace.manage.credential',
		dataTable: 'instanceRoles.personalSpace.manage.dataTable',
		agent: 'instanceRoles.personalSpace.manage.agent',
		folder: 'instanceRoles.personalSpace.manage.folder',
		execution: 'instanceRoles.personalSpace.manage.execution',
	},
};
