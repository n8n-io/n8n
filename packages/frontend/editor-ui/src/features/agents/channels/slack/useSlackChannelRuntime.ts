import type {
	SlackManagedAppSettings,
	SlackManagedAppSettingsErrorCode,
	SlackManagedSetupState,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch, type Ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import {
	getTrustedOAuthOrigins,
	waitForOAuthCallback,
} from '@/features/credentials/composables/oauthCallback';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

import type { AgentChannelRuntime, AgentChannelRuntimeContext } from '../types';
import {
	createSlackAgentApp,
	createSlackManagerCredential,
	finalizeSlackManagerCredential,
	getSlackApiErrorCode,
	getSlackManagedAppSettings,
	getSlackManagedSetup,
	installSlackManagedApp,
	updateSlackManagedAppSettings,
} from './api';

const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;
const SLACK_MANAGER_CREDENTIAL_TYPE = 'slackManagerOAuth2Api';
export type SlackSetupKind = 'managed' | 'manual';

export interface SlackChannelRuntime extends AgentChannelRuntime {
	setup: Ref<SlackManagedSetupState>;
	setupKind: Ref<SlackSetupKind>;
	settings: Ref<SlackManagedAppSettings | null>;
	settingsLoading: Ref<boolean>;
	settingsError: Ref<boolean>;
	settingsSaveError: Ref<SlackManagedAppSettingsErrorCode | null>;
	isManagedCredential: (credentialId: string) => boolean;
	setupApp: (
		appConfigurationToken: string,
		onConnected: () => void | Promise<void>,
	) => Promise<boolean>;
	connectManagerCredential: (credentialId?: string) => Promise<boolean>;
	editManagerCredential: (credentialId: string) => void;
	installManagedApp: (
		managerCredentialId: string,
		workspaceId: string,
		onConnected: () => void | Promise<void>,
	) => Promise<boolean>;
	saveSettings: (
		settings: Pick<
			SlackManagedAppSettings,
			'credentialId' | 'name' | 'description' | 'alwaysOnline'
		>,
	) => Promise<void>;
}

export function isSlackChannelRuntime(
	runtime: AgentChannelRuntime,
): runtime is SlackChannelRuntime {
	return 'setup' in runtime;
}

export function useSlackChannelRuntime(context: AgentChannelRuntimeContext): SlackChannelRuntime {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const credentialOAuth = useCredentialOAuth();

	const setup = ref<SlackManagedSetupState>({
		managedSetupAvailable: false,
		managerCredentials: [],
	});
	const setupKind = ref<SlackSetupKind>('managed');
	const loading = ref(true);
	const settings = ref<SlackManagedAppSettings | null>(null);
	const settingsLoading = ref(false);
	const settingsError = ref(false);
	const settingsSaveError = ref<SlackManagedAppSettingsErrorCode | null>(null);
	let settingsRequestId = 0;

	function isManagedCredential(credentialId: string): boolean {
		return setup.value.managerCredentials.some((manager) =>
			manager.workspaces.some((workspace) => workspace.botCredentialId === credentialId),
		);
	}

	async function loadSettings(credentialId: string) {
		const requestId = ++settingsRequestId;
		if (!credentialId || !isManagedCredential(credentialId)) {
			settings.value = null;
			settingsError.value = false;
			return;
		}

		settingsLoading.value = true;
		settingsError.value = false;
		try {
			const result = await getSlackManagedAppSettings(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
				credentialId,
			);
			if (requestId === settingsRequestId) settings.value = result;
		} catch {
			if (requestId === settingsRequestId) {
				settings.value = null;
				settingsError.value = true;
			}
		} finally {
			if (requestId === settingsRequestId) settingsLoading.value = false;
		}
	}

	async function load() {
		loading.value = true;
		try {
			setup.value = await getSlackManagedSetup(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
		} catch {
			setup.value = { managedSetupAvailable: false, managerCredentials: [] };
		} finally {
			loading.value = false;
		}
		await loadSettings(context.selectedCredentialId.value);
	}

	function openAuthorizationPopup(installUrl: string): Window {
		const parsedUrl = new URL(installUrl);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw new Error('Invalid Slack installation URL');
		}
		const popup = window.open(
			parsedUrl.toString(),
			'Slack App Authorization',
			'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700',
		);
		if (!popup) throw new Error('Slack authorization popup was blocked');
		return popup;
	}

	async function waitForSetupCompletion(popup: Window): Promise<boolean> {
		const outcome = await waitForOAuthCallback({
			popup,
			trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
			verifyConnected: async () => {
				await context.fetchStatus(['slack']);
				return context.isConfigured('slack');
			},
			timeoutMs: SLACK_APP_SETUP_TIMEOUT_MS,
			abortOnPopupClose: true,
		});
		popup.close();
		return outcome === 'success';
	}

	async function setupApp(
		appConfigurationToken: string,
		onConnected: () => void | Promise<void>,
	): Promise<boolean> {
		await context.ensureAgentPersisted?.();
		const { installUrl } = await createSlackAgentApp(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			appConfigurationToken,
		);
		const connected = await waitForSetupCompletion(openAuthorizationPopup(installUrl));
		if (!connected) throw new Error('Slack app installation was not completed');
		await context.fetchStatus(['slack']);
		await onConnected();
		return true;
	}

	async function finalizeConnectedManagerCredential(
		credentialId: string,
		connected: boolean,
	): Promise<boolean> {
		if (!connected) return false;
		await finalizeSlackManagerCredential(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			credentialId,
		).catch(() => {});
		await load();
		return true;
	}

	async function connectManagerCredential(credentialId?: string): Promise<boolean> {
		await context.ensureAgentPersisted?.();
		let id = credentialId;
		let createdCredentialId: string | undefined;
		let authorizationStarted = false;
		if (!id) {
			const created = await createSlackManagerCredential(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
			id = created.id;
			createdCredentialId = created.id;
		}

		try {
			credentialsStore.setCredentials([]);
			const credentials = await credentialsStore.fetchUsableCredentials({
				projectId: context.projectId.value,
			});
			const credential = credentials.find(
				(item) => item.id === id && item.type === SLACK_MANAGER_CREDENTIAL_TYPE,
			);
			if (!credential) throw new Error('Slack manager credential could not be loaded');
			if (createdCredentialId) {
				authorizationStarted = true;
				const connected = await credentialOAuth.authorizeNewCredential(credential, {
					abortOnPopupClose: true,
				});
				return await finalizeConnectedManagerCredential(id, connected);
			}
			const connected = await credentialOAuth.authorize(credential, undefined, {
				abortOnPopupClose: true,
			});
			return await finalizeConnectedManagerCredential(id, connected);
		} finally {
			if (createdCredentialId && !authorizationStarted) {
				await credentialsStore.deleteCredential({ id: createdCredentialId });
			}
		}
	}

	function editManagerCredential(credentialId: string) {
		uiStore.openExistingCredential(credentialId, {
			hideAskAssistant: true,
			appendToBody: true,
		});
	}

	async function installManagedApp(
		managerCredentialId: string,
		workspaceId: string,
		onConnected: () => void | Promise<void>,
	): Promise<boolean> {
		await context.ensureAgentPersisted?.();
		const result = await installSlackManagedApp(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			managerCredentialId,
			workspaceId,
		);
		if (result.status === 'manual_install_required') {
			const connected = await waitForSetupCompletion(openAuthorizationPopup(result.installUrl));
			if (!connected) throw new Error('Slack app installation was not completed');
		}
		await context.fetchStatus(['slack']);
		await load();
		await onConnected();
		return true;
	}

	async function saveSettings(
		update: Pick<SlackManagedAppSettings, 'credentialId' | 'name' | 'description' | 'alwaysOnline'>,
	) {
		settingsLoading.value = true;
		settingsError.value = false;
		settingsSaveError.value = null;
		try {
			settings.value = await updateSlackManagedAppSettings(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
				update,
			);
		} catch (error) {
			const code = getSlackApiErrorCode(error);
			if (code === 'service_limits_exceeded') {
				settingsSaveError.value = code;
			}
			throw error;
		} finally {
			settingsLoading.value = false;
		}
	}

	watch(context.selectedCredentialId, (credentialId) => {
		void loadSettings(credentialId);
	});
	watch(context.credentialModalOpen, (isOpen, wasOpen) => {
		if (wasOpen && !isOpen) void load();
	});

	return {
		setup,
		setupKind,
		settings,
		loading: computed(() => loading.value),
		settingsLoading,
		settingsError,
		settingsSaveError,
		load,
		isManagedCredential,
		setupApp,
		connectManagerCredential,
		editManagerCredential,
		installManagedApp,
		saveSettings,
	};
}
