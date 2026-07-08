import type { AgentIntegrationSettings, ChatIntegrationDescriptor } from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import type { AgentCredentialOption } from '../components/AgentCredentialSelect.vue';
import { createSlackAgentApp } from './useAgentApi';

const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
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

	const selectedCredentials = ref<Record<string, string>>({});
	const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
	const credentialsLoading = ref(false);
	const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
	const pendingNewCredentialType = ref<string | null>(null);
	const channelSetupRef = ref<ChannelSetupComponent>();
	const loadedIntegrations = ref<ChatIntegrationDescriptor[]>([]);

	const projectId = computed(() => toValue(options.projectId));
	const agentId = computed(() => toValue(options.agentId));
	const currentIntegration = computed(() => toValue(options.currentIntegration) ?? null);
	const connectedCredentials = computed(() => toValue(options.connectedCredentials));

	const projectForPermissions = computed(() => {
		if (projectsStore.currentProject?.id === projectId.value) return projectsStore.currentProject;
		if (projectsStore.personalProject?.id === projectId.value) return projectsStore.personalProject;
		return projectsStore.myProjects.find((project) => project.id === projectId.value) ?? null;
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
		return await new Promise((resolve) => {
			const oauthChannel = new BroadcastChannel('oauth-callback');
			let pollInFlight = false;
			let settled = false;

			const closePopup = () => {
				try {
					popup.close();
				} catch {}
			};

			const settle = (success: boolean) => {
				if (settled) return;
				settled = true;
				window.clearInterval(pollInterval);
				window.clearTimeout(timeout);
				oauthChannel.close();
				if (success) closePopup();
				resolve(success);
			};

			const pollStatus = async () => {
				if (pollInFlight || settled) return;
				pollInFlight = true;
				try {
					await options.fetchStatus(['slack']);
					if (options.isIntegrationConnected('slack')) settle(true);
				} finally {
					pollInFlight = false;
				}
			};

			const pollInterval = window.setInterval(
				() => void pollStatus(),
				SLACK_APP_SETUP_POLL_INTERVAL_MS,
			);
			const timeout = window.setTimeout(() => settle(false), SLACK_APP_SETUP_TIMEOUT_MS);

			oauthChannel.addEventListener('message', (event: MessageEvent) => {
				settle(event.data === 'success');
			});

			void pollStatus();
		});
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
		setupSlackApp,
	};
}
