import {
	appAgentPermissionSchema,
	appBindingSchema,
	appDataTablePermissionSchema,
	listAppCredentialOperations,
	type AppAgentPermission,
	type AppBinding,
	type AppBindingKind,
	type AppBindingWarning,
	type AppCredentialBinding,
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
	/** Kinds without an add label are added by the n8n Assistant only. */
	addLabel?: BaseTextKey;
	permissions: readonly BindingPermission[];
	defaultPermissions: readonly BindingPermission[];
	route: (projectId: string, resourceId: string) => RouteLocationRaw;
};

export const BINDING_KIND_ORDER: readonly AppBindingKind[] = [
	'workflow',
	'dataTable',
	'agent',
	'credential',
];

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
	credential: {
		icon: 'key-round',
		label: 'apps.configure.connections.credentials',
		permissions: [],
		defaultPermissions: [],
		route: (projectId, credentialId) => ({
			name: VIEWS.PROJECTS_CREDENTIALS,
			params: { projectId, credentialId },
		}),
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
	credential: 'credentialId',
} as const satisfies Record<AppBindingKind, string>;

export function resourceIdOf(binding: AppBinding): string {
	switch (binding.kind) {
		case 'workflow':
			return binding.workflowId;
		case 'dataTable':
			return binding.dataTableId;
		case 'agent':
			return binding.agentId;
		case 'credential':
			return binding.credentialId;
	}
}

export function permissionsOf(binding: AppBinding): readonly BindingPermission[] {
	return binding.kind === 'dataTable' || binding.kind === 'agent' ? binding.permissions : [];
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
		...((kind === 'dataTable' || kind === 'agent') && { permissions }),
	});
}

export function withPermissions(
	binding: AppBinding,
	permissions: readonly BindingPermission[],
): AppBinding {
	return createBinding(binding.kind, binding.key, resourceIdOf(binding), permissions);
}

/** Returns `null` when the binding has no operation left. */
export function withoutOperation(
	binding: AppCredentialBinding,
	operationId: string,
): AppCredentialBinding | null {
	const paths = Object.fromEntries(
		Object.entries(binding.paths)
			.map(([path, item]) => [
				path,
				Object.fromEntries(
					Object.entries(item).filter(([, operation]) => operation?.operationId !== operationId),
				),
			])
			.filter(([, item]) => Object.keys(item).length > 0),
	);
	const next = { ...binding, paths };
	return listAppCredentialOperations(next).length > 0 ? next : null;
}
