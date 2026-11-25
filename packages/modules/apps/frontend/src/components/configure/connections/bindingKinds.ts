import {
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
	openLabel: BaseTextKey;
	noMatches: BaseTextKey;
	removeMessage: BaseTextKey;
	defaultPermissions: readonly BindingPermission[];
	route: (projectId: string, resourceId: string) => RouteLocationRaw;
};

export const BINDING_KIND_ORDER: readonly AppBindingKind[] = ['workflow', 'dataTable', 'agent'];

export const BINDING_KINDS: Record<AppBindingKind, BindingKindConfig> = {
	workflow: {
		icon: 'workflow',
		label: 'apps.configure.connections.workflows',
		addLabel: 'apps.configure.connections.addWorkflow',
		openLabel: 'apps.configure.connections.openWorkflow',
		noMatches: 'apps.configure.connections.noMatches.workflow',
		removeMessage: 'apps.configure.connections.removeConfirm.message.workflow',
		defaultPermissions: [],
		route: (_projectId, workflowId) => ({ name: VIEWS.WORKFLOW, params: { workflowId } }),
	},
	dataTable: {
		icon: 'table',
		label: 'apps.configure.connections.dataTables',
		addLabel: 'apps.configure.connections.addDataTable',
		openLabel: 'apps.configure.connections.openDataTable',
		noMatches: 'apps.configure.connections.noMatches.dataTable',
		removeMessage: 'apps.configure.connections.removeConfirm.message.dataTable',
		defaultPermissions: ['read'],
		route: (projectId, id) => ({ name: DATA_TABLE_DETAILS, params: { projectId, id } }),
	},
	agent: {
		icon: 'robot',
		label: 'apps.configure.connections.agents',
		addLabel: 'apps.configure.connections.addAgent',
		openLabel: 'apps.configure.connections.openAgent',
		noMatches: 'apps.configure.connections.noMatches.agent',
		removeMessage: 'apps.configure.connections.removeConfirm.message.agent',
		defaultPermissions: ['chat'],
		route: (projectId, agentId) => ({ name: AGENT_VIEW, params: { projectId, agentId } }),
	},
};

const DATA_TABLE_VERBS: Record<AppDataTablePermission, BaseTextKey> = {
	read: 'apps.configure.connections.setup.verb.read',
	insert: 'apps.configure.connections.setup.verb.insert',
	update: 'apps.configure.connections.setup.verb.update',
	delete: 'apps.configure.connections.setup.verb.delete',
};

/** The sentence that tells what the app does with a connection, with the part to show in bold. */
export type SetupSentence = { template: BaseTextKey; actions: BaseTextKey; verbs?: BaseTextKey[] };

export function setupSentence(binding: AppBinding): SetupSentence {
	switch (binding.kind) {
		case 'workflow':
			return {
				template: 'apps.configure.connections.setup',
				actions: 'apps.configure.connections.setup.workflow',
			};
		case 'dataTable':
			return {
				template: 'apps.configure.connections.setup.dataTable',
				actions: 'apps.configure.connections.setup.dataTable.rows',
				verbs: appDataTablePermissionSchema.options
					.filter((permission) => binding.permissions.includes(permission))
					.map((permission) => DATA_TABLE_VERBS[permission]),
			};
		case 'agent': {
			const chat = binding.permissions.includes('chat');
			const history = binding.permissions.includes('history');
			return {
				template: 'apps.configure.connections.setup',
				actions:
					chat && history
						? 'apps.configure.connections.setup.agent.chatAndHistory'
						: history
							? 'apps.configure.connections.setup.agent.history'
							: 'apps.configure.connections.setup.agent.chat',
			};
		}
	}
}

const WARNING_LABELS: Record<AppBindingWarning['code'], BaseTextKey> = {
	resource_missing: 'apps.configure.connections.warning.resource_missing',
	resource_unpublished: 'apps.configure.connections.warning.resource_unpublished',
};

// Data tables have no published state, so only workflows and agents name their kind.
const UNPUBLISHED_LABELS: Partial<Record<AppBindingKind, BaseTextKey>> = {
	workflow: 'apps.configure.connections.warning.resource_unpublished.workflow',
	agent: 'apps.configure.connections.warning.resource_unpublished.agent',
};

export function warningLabel(code: AppBindingWarning['code'], kind: AppBindingKind): BaseTextKey {
	return (code === 'resource_unpublished' && UNPUBLISHED_LABELS[kind]) || WARNING_LABELS[code];
}

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
