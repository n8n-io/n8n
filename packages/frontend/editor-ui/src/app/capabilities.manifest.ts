import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type {
	CreateEnvironmentVariable,
	CredentialEditorOptions,
	ResourceEditorKind,
	VariableEditorOptions,
} from '@n8n/frontend-module-sdk';

import type { IWorkflowSettings, ModalKey } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { useEnvironmentsVersionSwitch } from '@/features/shared/promotions/useEnvironmentsVersionSwitch';
import { isPromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useSelfHealingChatHandoff } from '@/features/ai/instanceAi/composables/useSelfHealingChatHandoff';
import { useAppAssistantHandoff } from '@/features/ai/instanceAi/composables/useAppAssistantHandoff';
// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { mcpDiscoverySettings } from '@/experiments/surfaceMcpToClaudeTrialUsers/mcpDiscoverySettings';
// EOF Experiment cleanup

/**
 * Shell actions that a module calls but cannot import — the counterpart to
 * `componentSlots.manifest.ts` for the `capabilityRegistry`.
 *
 * Module-level, so a replayed registration provides the same identity and the
 * registry stays silent. Each method reads the store when it is called: this
 * file is evaluated before `app.use(pinia)`.
 */
const modalOpeners = {
	openModal: (name: ModalKey) => useUIStore().openModal(name),
	openModalWithData: (payload: { name: ModalKey; data: Record<string, unknown> }) =>
		useUIStore().openModalWithData(payload),
};

const syncWorkflowMcpAccess = (workflowIds: string[], availableInMCP: boolean) => {
	const workflowsListStore = useWorkflowsListStore();

	for (const workflowId of workflowIds) {
		const existing = workflowsListStore.workflowsById[workflowId];
		if (existing) {
			if (existing.settings) {
				existing.settings.availableInMCP = availableInMCP;
			} else {
				existing.settings = { availableInMCP } as IWorkflowSettings;
			}
		}

		// Only an open document needs the value. A document opened later loads it from the server.
		useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId))?.mergeSettings({
			availableInMCP,
		});
	}
};

// The offer loads lazily: it reaches the MCP store, which the boot chunk does not need.
const mcpExposeAllOffer = {
	isEnabled: () => useExposeAllWorkflowsToMcpStore().isEnabled,
	offer: async (onExposed: () => Promise<void> | void) => {
		const { useExposeAllWorkflowsToMcpOffer } = await import(
			'@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer'
		);
		return await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(onExposed);
	},
};

const projectPermissions = {
	scopesFor: (projectId: string) => [
		...(useUsersStore().currentUser?.globalScopes ?? []),
		...(useProjectsStore().myProjects.find((project) => project.id === projectId)?.scopes ?? []),
	],
	defaultProjectId: () =>
		useProjectsStore().currentProject?.id ?? useProjectsStore().personalProject?.id,
	isReadOnly: () => useSourceControlStore().preferences.branchReadOnly,
};

const projectContext = {
	currentProject: () => useProjectsStore().currentProject,
	currentProjectId: () => useProjectsStore().currentProjectId,
	setCurrentProject: (project: Project) => useProjectsStore().setCurrentProject(project),
	hasTeamProjectQuota: () => useProjectsStore().hasTeamProjectQuota,
	getMyProjects: async () => await useProjectsStore().getMyProjects(),
	getProjectsCount: async () => await useProjectsStore().getProjectsCount(),
	getAllProjects: async () => await useProjectsStore().getAllProjects(),
};

const editorModalKeys = {
	credential: CREDENTIAL_EDIT_MODAL_KEY,
	variable: VARIABLE_MODAL_KEY,
} as const;

// The credentials and variables stores load lazily: the boot chunk does not need them.
const resourceEditors = {
	hasCredentialType: async (type: string) => {
		const { useCredentialsStore } = await import('@/features/credentials/credentials.store');
		const credentialsStore = useCredentialsStore();
		await credentialsStore.fetchCredentialTypes(false);
		return credentialsStore.getCredentialTypeByName(type) !== undefined;
	},
	loadVariables: async () => {
		const { useEnvironmentsStore } = await import(
			'@/features/settings/environments.ee/environments.store'
		);
		await useEnvironmentsStore().fetchAllVariables();
	},
	createVariable: async (variable: CreateEnvironmentVariable) => {
		const { useEnvironmentsStore } = await import(
			'@/features/settings/environments.ee/environments.store'
		);
		return await useEnvironmentsStore().createVariable(variable);
	},
	openCredentialEditor: (type: string, options: CredentialEditorOptions) =>
		useUIStore().openNewCredential(
			type,
			false,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			options,
		),
	openVariableEditor: (options: VariableEditorOptions) =>
		useUIStore().openModalWithData({
			name: VARIABLE_MODAL_KEY,
			data: { ...options, mode: 'new' },
		}),
	isEditorOpen: (editor: ResourceEditorKind) =>
		useUIStore().modalsById[editorModalKeys[editor]]?.open === true,
	closeEditor: (editor: ResourceEditorKind) => useUIStore().closeModal(editorModalKeys[editor]),
};

const environmentsSettings = {
	isPromotionsEnabled,
	isProtected: () => useSourceControlStore().preferences.branchReadOnly,
	loadPreferences: async () => {
		await useSourceControlStore().getPreferences();
	},
	setProtected: async (value: boolean) => {
		await useSourceControlStore().updatePreferences({ branchReadOnly: value });
	},
	useVersionSwitch: useEnvironmentsVersionSwitch,
};

const tagNames = {
	load: async () => {
		await useTagsStore().fetchAll();
	},
	nameOf: (id: string) => useTagsStore().tagsById[id]?.name,
};

export const registerShellCapabilities = () => {
	capabilityRegistry.provide(capabilities.modalOpeners, modalOpeners);
	capabilityRegistry.provide(capabilities.projectPermissions, projectPermissions);
	capabilityRegistry.provide(capabilities.workflowMcpAccessSync, syncWorkflowMcpAccess);
	capabilityRegistry.provide(capabilities.mcpExposeAllOffer, mcpExposeAllOffer);
	capabilityRegistry.provide(capabilities.createSelfHealingChatHandoff, useSelfHealingChatHandoff);
	capabilityRegistry.provide(capabilities.projectContext, projectContext);
	capabilityRegistry.provide(capabilities.resourceEditors, resourceEditors);
	capabilityRegistry.provide(capabilities.environmentsSettings, environmentsSettings);
	capabilityRegistry.provide(capabilities.tagNames, tagNames);
	capabilityRegistry.provide(capabilities.createAppAssistantHandoff, useAppAssistantHandoff);
	// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
	capabilityRegistry.provide(capabilities.mcpDiscoverySettings, mcpDiscoverySettings);
	// EOF Experiment cleanup
};
