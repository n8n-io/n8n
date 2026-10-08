import type {
	TeamsAzureSubscription,
	TeamsAgentSetupState,
	TeamsManagedSetupState,
	TeamsProvisionedAppSummary,
	TeamsProvisionedBotSummary,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch, type Ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

import type { AgentChannelRuntime, AgentChannelRuntimeContext } from '../types';
import {
	createTeamsManagerCredential,
	getTeamsAzureSubscriptions,
	getTeamsManagedSetup,
	getTeamsSetupState,
	checkTeamsAppInstalled,
	provisionTeamsApp,
	provisionTeamsBot,
} from './api';

const TEAMS_MANAGER_CREDENTIAL_TYPE = 'microsoftTeamsManagerOAuth2Api';

export type TeamsSetupKind = 'managed' | 'manual';

export interface TeamsChannelRuntime extends AgentChannelRuntime {
	managedSetup: Ref<TeamsManagedSetupState>;
	setupKind: Ref<TeamsSetupKind>;
	/** Sign-in the recommended flow is currently provisioning with. */
	managerCredentialId: Ref<string>;
	connectManagerCredential: (credentialId?: string) => Promise<boolean>;
	editManagerCredential: (credentialId: string) => void;
	/** What each provisioning step left behind, so a step can show its result. */
	provisionedApp: Ref<TeamsProvisionedAppSummary | null>;
	/** Endpoint and Deploy to Azure link, for the rungs n8n does not do itself. */
	botSetupState: Ref<TeamsAgentSetupState | null>;
	provisionedBot: Ref<TeamsProvisionedBotSummary | null>;
	subscriptions: Ref<TeamsAzureSubscription[]>;
	/** Whether Microsoft reports the app installed for the signed-in user. */
	installed: Ref<boolean>;
	provisionApp: () => Promise<void>;
	loadSubscriptions: () => Promise<void>;
	provisionBot: (subscriptionId: string) => Promise<void>;
	checkInstalled: () => Promise<boolean>;
}

export function isTeamsChannelRuntime(
	runtime: AgentChannelRuntime,
): runtime is TeamsChannelRuntime {
	return 'managedSetup' in runtime;
}

const emptyState = (): TeamsManagedSetupState => ({
	managedSetupAvailable: false,
	managerCredentials: [],
	adminConsentUrl: null,
});

export function useTeamsChannelRuntime(context: AgentChannelRuntimeContext): TeamsChannelRuntime {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const credentialOAuth = useCredentialOAuth();

	const managedSetup = ref<TeamsManagedSetupState>(emptyState());
	const setupKind = ref<TeamsSetupKind>('managed');
	const managerCredentialId = ref('');
	// Starts false, not true: the channel modal builds a runtime for every
	// registered platform but only calls `load()` for the ones in the catalog,
	// and it gates the whole channel list on no runtime reporting loading. A
	// runtime that has never loaded is not loading.
	const loading = ref(false);
	const provisionedApp = ref<TeamsProvisionedAppSummary | null>(null);
	const botSetupState = ref<TeamsAgentSetupState | null>(null);
	const provisionedBot = ref<TeamsProvisionedBotSummary | null>(null);
	const subscriptions = ref<TeamsAzureSubscription[]>([]);
	const installed = ref(false);

	/** Every provisioning call needs a finished sign-in to act with. */
	function requireManagerCredential(): string {
		if (!managerCredentialId.value)
			throw new Error(i18n.baseText('agents.channels.teams.managed.errors.signInFirst'));
		return managerCredentialId.value;
	}

	function requireProvisionedCredential(): string {
		const credentialId = provisionedApp.value?.credentialId;
		if (!credentialId)
			throw new Error(i18n.baseText('agents.channels.teams.managed.errors.createAppFirst'));
		return credentialId;
	}

	async function load() {
		loading.value = true;
		try {
			managedSetup.value = await getTeamsManagedSetup(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
		} catch {
			// An unavailable recommended setup is not an error state: the manual
			// stepper is a complete flow on its own, so fall back to it silently.
			managedSetup.value = emptyState();
		} finally {
			loading.value = false;
		}

		// Keep a usable sign-in selected so the stepper does not open on an empty
		// picker when the project already has one.
		const connected = managedSetup.value.managerCredentials.find((item) => item.connected);
		if (!managerCredentialId.value && connected) managerCredentialId.value = connected.id;
	}

	async function connectManagerCredential(credentialId?: string): Promise<boolean> {
		await context.ensureAgentPersisted?.();
		let id = credentialId;
		let createdCredentialId: string | undefined;
		let signedIn = false;

		if (!id) {
			const created = await createTeamsManagerCredential(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
			id = created.id;
			createdCredentialId = created.id;
		}

		try {
			// The fetch returns what this project can use, which is all this needs.
			// Emptying the store first would also clear every other view's.
			const credentials = await credentialsStore.fetchUsableCredentials({
				projectId: context.projectId.value,
			});
			const credential = credentials.find(
				(item) => item.id === id && item.type === TEAMS_MANAGER_CREDENTIAL_TYPE,
			);
			if (!credential)
				throw new Error(i18n.baseText('agents.channels.teams.managed.errors.credentialMissing'));

			const connected = createdCredentialId
				? await credentialOAuth.authorizeNewCredential(credential, { abortOnPopupClose: true })
				: await credentialOAuth.authorize(credential, undefined, { abortOnPopupClose: true });

			if (!connected) return false;
			signedIn = true;
			managerCredentialId.value = id;
			await load();
			return true;
		} finally {
			// A credential nothing ever signed in to is litter, whether the popup
			// never opened or the user closed it again. Keyed on the sign-in rather
			// than on the attempt, or every abandoned attempt leaves one behind.
			if (createdCredentialId && !signedIn) {
				await credentialsStore.deleteCredential({ id: createdCredentialId });
			}
		}
	}

	async function provisionApp() {
		provisionedApp.value = await provisionTeamsApp(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			requireManagerCredential(),
		);
		// The Entra app is what names the organisation, so the Connect summary
		// only becomes accurate once this has run.
		await load();

		// Read once here so the bot step can offer the manual rungs without a
		// second round trip when no subscription turns up.
		botSetupState.value = await getTeamsSetupState(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			provisionedApp.value.credentialId,
		);
	}

	async function loadSubscriptions() {
		subscriptions.value = await getTeamsAzureSubscriptions(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			requireManagerCredential(),
		);
	}

	async function provisionBot(subscriptionId: string) {
		provisionedBot.value = await provisionTeamsBot(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			{
				managerCredentialId: requireManagerCredential(),
				credentialId: requireProvisionedCredential(),
				subscriptionId,
			},
		);
	}

	/**
	 * For the app the user uploaded in Teams themselves. n8n never saw it happen,
	 * so Microsoft is asked instead of guessed at.
	 */
	async function checkInstalled() {
		const result = await checkTeamsAppInstalled(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			{ managerCredentialId: requireManagerCredential() },
		);
		installed.value = result.installed;
	}

	function editManagerCredential(credentialId: string) {
		uiStore.openExistingCredential(credentialId, {
			hideAskAssistant: true,
			appendToBody: true,
		});
	}

	watch(context.credentialModalOpen, (isOpen, wasOpen) => {
		if (wasOpen && !isOpen) void load();
	});

	return {
		managedSetup,
		setupKind,
		managerCredentialId,
		loading: computed(() => loading.value),
		load,
		connectManagerCredential,
		editManagerCredential,
		provisionedApp,
		botSetupState,
		provisionedBot,
		subscriptions,
		installed,
		provisionApp,
		loadSubscriptions,
		provisionBot,
		checkInstalled: async () => {
			await checkInstalled();
			return installed.value;
		},
	};
}
