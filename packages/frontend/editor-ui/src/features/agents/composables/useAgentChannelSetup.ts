import type {
	AgentIntegrationSettings,
	ChatIntegrationDescriptor,
	SlackManagedSetupState,
} from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import {
	getTrustedOAuthOrigins,
	waitForOAuthCallback,
} from '@/features/credentials/composables/oauthCallback';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';

import type { AgentCredentialOption } from '../components/AgentCredentialSelect.vue';
import {
	createSlackAgentApp,
	createSlackManagerCredential,
	getSlackManagedSetup,
	installSlackManagedApp,
} from './useAgentApi';

const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;

type ChannelSetupComponent = {
	credentialId: string;
	currentSettings?: AgentIntegrationSettings;
	validationError: string | null;
};

type UseAgentChannelSetupOptions = {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	currentIntegration: MaybeRefOrGetter<ChatIntegrationDescriptor | null | undefined>;
	connectedCredentials: MaybeRefOrGetter<Record<string, string>>;
	fetchStatus: (integrationTypes: string[]) => Promise<void>;
	isIntegrationConnected: (type: string) => boolean;
};

export function useAgentChannelSetup(options: UseAgentChannelSetupOptions) {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const credentialOAuth = useCredentialOAuth();

	const selectedCredentials = ref<Record<string, string>>({});
	const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
	const credentialsLoading = ref(false);
	const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
	const pendingNewCredentialType = ref<string | null>(null);
	const channelSetupRef = ref<ChannelSetupComponent>();
	const loadedIntegrations = ref<ChatIntegrationDescriptor[]>([]);
	const fetchedProjectForPermissions = ref<Project | null>(null);
	const managedSlackSetup = ref<SlackManagedSetupState>({
		managedSetupAvailable: false,
		managerCredentials: [],
	});
	const managedSlackSetupLoading = ref(false);

	const projectId = computed(() => toValue(options.projectId));
	const agentId = computed(() => toValue(options.agentId));
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
			const allCredentials = await credentialsStore.fetchAllCredentialsForWorkflow({
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
			loadManagedSlackSetup(),
		]);
		syncSelectedConnectedCredentials();
	}

	async function loadManagedSlackSetup() {
		managedSlackSetupLoading.value = true;
		try {
			managedSlackSetup.value = await getSlackManagedSetup(
				rootStore.restApiContext,
				projectId.value,
				agentId.value,
			);
		} catch {
			managedSlackSetup.value = { managedSetupAvailable: false, managerCredentials: [] };
		} finally {
			managedSlackSetupLoading.value = false;
		}
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

	function openSlackAppAuthorizationPopup(installUrl: string): Window {
		const parsedUrl = new URL(installUrl);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw new Error('Invalid Slack installation URL');
		}

		const params =
			'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
		const popup = window.open(parsedUrl.toString(), 'Slack App Authorization', params);
		if (!popup) {
			throw new Error('Slack authorization popup was blocked');
		}
		return popup;
	}

	async function waitForSlackAppSetupCompletion(popup: Window): Promise<boolean> {
		const outcome = await waitForOAuthCallback({
			popup,
			trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
			verifyConnected: async () => {
				await options.fetchStatus(['slack']);
				return options.isIntegrationConnected('slack');
			},
			timeoutMs: SLACK_APP_SETUP_TIMEOUT_MS,
		});

		popup.close();
		return outcome === 'success';
	}

	async function setupSlackApp(
		appConfigurationToken: string,
		onConnected: () => void | Promise<void>,
	): Promise<boolean> {
		const { installUrl } = await createSlackAgentApp(
			rootStore.restApiContext,
			projectId.value,
			agentId.value,
			appConfigurationToken,
		);
		const popup = openSlackAppAuthorizationPopup(installUrl);
		const connected = await waitForSlackAppSetupCompletion(popup);
		if (!connected) {
			throw new Error('Slack app installation was not completed');
		}

		await options.fetchStatus(['slack']);
		await onConnected();
		return true;
	}

	async function connectSlackManagerCredential(credentialId?: string): Promise<boolean> {
		let id = credentialId;
		if (!id) {
			const created = await createSlackManagerCredential(
				rootStore.restApiContext,
				projectId.value,
				agentId.value,
			);
			id = created.id;
		}

		credentialsStore.setCredentials([]);
		const credentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: projectId.value,
		});
		const credential = credentials.find((item) => item.id === id && item.type === 'slackOAuth2Api');
		if (!credential) throw new Error('Slack manager credential could not be loaded');

		const connected = await credentialOAuth.authorize(credential);
		if (connected) await loadManagedSlackSetup();
		return connected;
	}

	async function installManagedSlack(
		managerCredentialId: string,
		workspaceId: string,
		onConnected: () => void | Promise<void>,
	): Promise<boolean> {
		const result = await installSlackManagedApp(
			rootStore.restApiContext,
			projectId.value,
			agentId.value,
			managerCredentialId,
			workspaceId,
		);
		if (result.status === 'manual_install_required') {
			const popup = openSlackAppAuthorizationPopup(result.installUrl);
			const connected = await waitForSlackAppSetupCompletion(popup);
			if (!connected) throw new Error('Slack app installation was not completed');
		}

		await options.fetchStatus(['slack']);
		await loadManagedSlackSetup();
		await onConnected();
		return true;
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
		managedSlackSetup,
		managedSlackSetupLoading,
		selectedCredentials,
		credentialsLoading,
		credentialPermissions,
		credentialModalOpen,
		getChannelCredentialId,
		getCredentials,
		loadChannelState,
		createCredential,
		editCredential,
		setupSlackApp,
		loadManagedSlackSetup,
		connectSlackManagerCredential,
		installManagedSlack,
	};
}
