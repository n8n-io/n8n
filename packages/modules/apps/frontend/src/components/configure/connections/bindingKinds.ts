import {
	appAgentPermissionSchema,
	appBindingSchema,
	appDataTablePermissionSchema,
	type AppAgentPermission,
	type AppBinding,
	type AppBindingKind,
	type AppBindingWarning,
	type AppDataTablePermission,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { AGENT_VIEW } from '@n8n/frontend-constants/agents';
import { DATA_TABLE_DETAILS } from '@n8n/frontend-constants/data-tables';
import { VIEWS } from '@n8n/frontend-constants/views';
import type { BaseTextKey } from '@n8n/i18n';
import type { RouteLocationRaw } from 'vue-router';

export type BindingPermission = AppDataTablePermission | AppAgentPermission;

type BindingKindConfig = {
	icon: IconName;
	label: BaseTextKey;
	addLabel: BaseTextKey;
	permissions: readonly BindingPermission[];
	defaultPermissions: readonly BindingPermission[];
	route: (projectId: string, resourceId: string) => RouteLocationRaw;
};

export const BINDING_KIND_ORDER: readonly AppBindingKind[] = ['workflow', 'dataTable', 'agent'];

export const BINDING_KINDS: Record<AppBindingKind, BindingKindConfig> = {
	workflow: {
		icon: 'workflow',
		label: 'apps.configure.connections.workflows',
		addLabel: 'apps.configure.connections.addWorkflow',
		permissions: [],
		defaultPermissions: [],
		route: (_projectId, workflowId) => ({ name: VIEWS.WORKFLOW, params: { workflowId } }),
	},
	dataTable: {
		icon: 'table',
		label: 'apps.configure.connections.dataTables',
		addLabel: 'apps.configure.connections.addDataTable',
		permissions: appDataTablePermissionSchema.options,
		defaultPermissions: ['read'],
		route: (projectId, id) => ({ name: DATA_TABLE_DETAILS, params: { projectId, id } }),
	},
	agent: {
		icon: 'robot',
		label: 'apps.configure.connections.agents',
		addLabel: 'apps.configure.connections.addAgent',
		permissions: appAgentPermissionSchema.options,
		defaultPermissions: ['chat'],
		route: (projectId, agentId) => ({ name: AGENT_VIEW, params: { projectId, agentId } }),
	},
};

export const PERMISSION_LABELS: Record<BindingPermission, BaseTextKey> = {
	read: 'apps.configure.connections.permission.read',
	insert: 'apps.configure.connections.permission.insert',
	update: 'apps.configure.connections.permission.update',
	delete: 'apps.configure.connections.permission.delete',
	chat: 'apps.configure.connections.permission.chat',
	history: 'apps.configure.connections.permission.history',
};

export const WARNING_LABELS: Record<AppBindingWarning['code'], BaseTextKey> = {
	resource_missing: 'apps.configure.connections.warning.resource_missing',
	resource_unpublished: 'apps.configure.connections.warning.resource_unpublished',
};

const RESOURCE_ID_FIELD = {
	workflow: 'workflowId',
	dataTable: 'dataTableId',
	agent: 'agentId',
} as const satisfies Record<AppBindingKind, string>;

export function resourceIdOf(binding: AppBinding): string {
	switch (binding.kind) {
		case 'workflow':
			return binding.workflowId;
		case 'dataTable':
			return binding.dataTableId;
		case 'agent':
			return binding.agentId;
	}
}

export function permissionsOf(binding: AppBinding): readonly BindingPermission[] {
	return binding.kind === 'workflow' ? [] : binding.permissions;
}

export function togglePermission(
	kind: AppBindingKind,
	current: readonly BindingPermission[],
	permission: BindingPermission,
	checked: boolean,
): BindingPermission[] {
	return BINDING_KINDS[kind].permissions.filter((entry) =>
		entry === permission ? checked : current.includes(entry),
	);
}

export function createBinding(
	kind: AppBindingKind,
	key: string,
	resourceId: string,
	permissions: readonly BindingPermission[],
): AppBinding {
	return appBindingSchema.parse({
		kind,
		key,
		[RESOURCE_ID_FIELD[kind]]: resourceId,
		...(kind !== 'workflow' && { permissions }),
	});
}

export function withPermissions(
	binding: AppBinding,
	permissions: readonly BindingPermission[],
): AppBinding {
	return createBinding(binding.kind, binding.key, resourceIdOf(binding), permissions);
}
