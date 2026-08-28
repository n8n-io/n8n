import type { AgentIntegrationSettings, ChatIntegrationDescriptor } from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';

import type { AgentCredentialOption } from '../components/AgentCredentialSelect.vue';

type ChannelSetupComponent = {
	credentialId: string;
	currentSettings?: AgentIntegrationSettings;
	validationError: string | null;
};

type UseAgentChannelSetupOptions = {
	projectId: MaybeRefOrGetter<string>;
	currentIntegration: MaybeRefOrGetter<ChatIntegrationDescriptor | null | undefined>;
	connectedCredentials: MaybeRefOrGetter<Record<string, string>>;
	fetchStatus: (integrationTypes: string[]) => Promise<void>;
};

export function useAgentChannelSetup(options: UseAgentChannelSetupOptions) {
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();

	const selectedCredentials = ref<Record<string, string>>({});
	const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
	const credentialsLoading = ref(false);
	const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
	const pendingNewCredentialType = ref<string | null>(null);
	const channelSetupRef = ref<ChannelSetupComponent>();
	const loadedIntegrations = ref<ChatIntegrationDescriptor[]>([]);
	const fetchedProjectForPermissions = ref<Project | null>(null);

	const projectId = computed(() => toValue(options.projectId));
	const currentIntegration = computed(() => toValue(options.currentIntegration) ?? null);
	const connectedCredentials = computed(() => toValue(options.connectedCredentials));

	const projectForPermissions = computed(() => {
		const storedProject =
			[
				projectsStore.currentProject,
				projectsStore.personalProject,
				...projectsStore.myProjects,
			].find((project) => project?.id === projectId.value) ?? null;
		if (storedProject?.scopes !== undefined) return storedProject;
		if (fetchedProjectForPermissions.value?.id === projectId.value) {
			return fetchedProjectForPermissions.value;
		}
		return storedProject;
	});

	const credentialPermissions = computed(() => {
		const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
		return { ...permissions, create: !!permissions.create };
	});

	const credentialModalOpen = computed(
		() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
	);

	function getChannelCredentialId(channelType: string | null | undefined) {
		if (!channelType) return '';
		return selectedCredentials.value[channelType] || connectedCredentials.value[channelType] || '';
	}

	function getCredentials(channelType: string | null | undefined) {
		if (!channelType) return [];
		return credentialsByType.value[channelType] ?? [];
	}

	function syncSelectedConnectedCredentials() {
		for (const [channelType, credentialId] of Object.entries(connectedCredentials.value)) {
			if (!selectedCredentials.value[channelType]) {
				selectedCredentials.value[channelType] = credentialId;
			}
		}
	}

	async function ensureProjectPermissions() {
		if (!projectId.value || projectForPermissions.value?.scopes !== undefined) return;

		try {
			const project = await projectsStore.fetchProject(projectId.value);
			if (project.id === projectId.value) fetchedProjectForPermissions.value = project;
		} catch {
			// Keep permissions fail-closed when the project cannot be loaded.
		}
	}

	async function fetchCredentials(integrations: ChatIntegrationDescriptor[]) {
		loadedIntegrations.value = integrations;
		credentialsLoading.value = true;
		try {
			credentialsStore.setCredentials([]);
			const allCredentials = await credentialsStore.fetchUsableCredentials({
				projectId: projectId.value,
			});

			for (const integration of integrations) {
				credentialsByType.value[integration.type] = allCredentials
					.filter((credential) => integration.credentialTypes.includes(credential.type))
					.map((credential) => ({
						id: credential.id,
						name: credential.name,
						typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
						homeProject: credential.homeProject,
					}));
			}
		} catch {
			for (const integration of integrations) {
				credentialsByType.value[integration.type] = [];
			}
		} finally {
			credentialsLoading.value = false;
		}
	}

	async function loadChannelState(integrations: ChatIntegrationDescriptor[]) {
		await Promise.all([
			ensureProjectPermissions(),
			options.fetchStatus(integrations.map((integration) => integration.type)),
			fetchCredentials(integrations),
		]);
		syncSelectedConnectedCredentials();
	}

	function createCredential() {
		const integration = currentIntegration.value;
		const [primaryCredentialType] = integration?.credentialTypes ?? [];
		if (!integration || !primaryCredentialType) return;

		const existing = credentialsByType.value[integration.type] ?? [];
		credentialIdsBeforeNew.value[integration.type] = new Set(
			existing.map((credential) => credential.id),
		);
		pendingNewCredentialType.value = integration.type;
		uiStore.openNewCredential(
			primaryCredentialType,
			false,
			false,
			projectId.value,
			undefined,
			undefined,
			undefined,
			{
				hideAskAssistant: true,
				appendToBody: true,
			},
		);
	}

	function editCredential(channelType = currentIntegration.value?.type) {
		const credentialId = getChannelCredentialId(channelType);
		if (credentialId) {
			uiStore.openExistingCredential(credentialId, { hideAskAssistant: true, appendToBody: true });
		}
	}

	watch(credentialModalOpen, async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen) return;
		const type = pendingNewCredentialType.value;
		pendingNewCredentialType.value = null;
		const integrations =
			loadedIntegrations.value.length > 0
				? loadedIntegrations.value
				: currentIntegration.value
					? [currentIntegration.value]
					: [];
		await fetchCredentials(integrations);
		if (!type) return;

		const before = credentialIdsBeforeNew.value[type];
		const after = credentialsByType.value[type] ?? [];
		const newCredential = before
			? after.find((credential) => !before.has(credential.id))
			: undefined;
		if (newCredential) {
			selectedCredentials.value[type] = newCredential.id;
		}
		delete credentialIdsBeforeNew.value[type];
	});

	return {
		channelSetupRef,
		selectedCredentials,
		credentialsLoading,
		credentialPermissions,
		credentialModalOpen,
		getChannelCredentialId,
		getCredentials,
		loadChannelState,
		createCredential,
		editCredential,
	};
}
