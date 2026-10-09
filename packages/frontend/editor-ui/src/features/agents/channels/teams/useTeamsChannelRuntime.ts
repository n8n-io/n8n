import type {
	AgentTeamsIntegrationSettings,
	TeamsAzureSubscription,
	TeamsCatalogState,
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
	getTeamsCatalogState,
	getTeamsManagedSetup,
	getTeamsSetupState,
	provisionTeamsApp,
	provisionTeamsBot,
	publishTeamsApp,
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
	catalogState: Ref<TeamsCatalogState | null>;
	connectedCredentialId: Ref<string>;
	provisionApp: () => Promise<void>;
	loadSubscriptions: () => Promise<void>;
	provisionBot: (subscriptionId: string) => Promise<void>;
	publishApp: (settings?: AgentTeamsIntegrationSettings) => Promise<void>;
	refreshCatalogState: () => Promise<void>;
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
	const catalogState = ref<TeamsCatalogState | null>(null);

	/** Every provisioning call needs a finished sign-in to act with. */
	function requireManagerCredential(): string {
		if (!managerCredentialId.value)
			throw new Error(i18n.baseText('agents.channels.teams.managed.errors.signInFirst'));
		return managerCredentialId.value;
	}

	/**
	 * The channel's own credential, handed over by the settings view. A setup
	 * reopened after it connected never ran the step that would have recorded
	 * one, but the channel is bound to the very credential that step wrote.
	 */
	const connectedCredentialId = ref('');

	/**
	 * The settings view's credential wins: it is the one the save binds to the
	 * agent, so publishing the one this session happened to register would put a
	 * manifest in the catalogue naming a bot the channel does not use.
	 */
	function channelCredentialId(): string {
		return connectedCredentialId.value || (provisionedApp.value?.credentialId ?? '');
	}

	function requireProvisionedCredential(): string {
		const credentialId = channelCredentialId();
		if (!credentialId)
			throw new Error(i18n.baseText('agents.channels.teams.managed.errors.createAppFirst'));
		return credentialId;
	}

	/**
	 * What a reply belongs to. Every call below is made for one agent and one
	 * Microsoft sign-in, and the modal keeps this runtime across both changing.
	 * A reply that lands after either moved would repopulate state the view has
	 * already cleared, with another tenant's values.
	 */
	function contextKey(): string {
		return [context.projectId.value, context.agentId.value, managerCredentialId.value].join('|');
	}

	async function load() {
		const requestedFor = [context.projectId.value, context.agentId.value].join('|');
		const isCurrent = () =>
			requestedFor === [context.projectId.value, context.agentId.value].join('|');
		loading.value = true;
		try {
			const state = await getTeamsManagedSetup(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
			if (!isCurrent()) return;
			managedSetup.value = state;
		} catch {
			if (!isCurrent()) return;
			// An unavailable recommended setup is not an error state: the manual
			// stepper is a complete flow on its own, so fall back to it silently.
			managedSetup.value = emptyState();
		} finally {
			// Not from a load the agent has moved on from: it would report the
			// newer one, still in flight, as finished.
			if (isCurrent()) loading.value = false;
		}

		// Keep a usable sign-in selected so the stepper does not open on an empty
		// picker when the project already has one.
		const connected = managedSetup.value.managerCredentials.find((item) => item.connected);
		if (!managerCredentialId.value && connected) managerCredentialId.value = connected.id;

		// What the catalogue says now, rather than what it said when this setup
		// was last open. Publishing can take a day to take effect, so coming back
		// later is the ordinary path, and until this the step only ever knew what
		// it had done itself. Not awaited: the stepper reads without it.
		if (managerCredentialId.value) void refreshCatalogState().catch(() => {});
	}

	async function connectManagerCredential(credentialId?: string): Promise<boolean> {
		await context.ensureAgentPersisted?.();
		let id = credentialId;
		let createdCredentialId: string | undefined;
		let reachedOAuth = false;

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

			// `abortOnPopupClose`, because without it a closed popup is only
			// noticed at the five-minute timeout -- and every step here is
			// disabled while the sign-in is in flight, with nothing to cancel it.
			//
			// From this line on, `authorizeNewCredential` owns the cleanup of a
			// credential it was handed, so nothing else may delete it.
			reachedOAuth = true;
			const connected = createdCredentialId
				? await credentialOAuth.authorizeNewCredential(credential, { abortOnPopupClose: true })
				: await credentialOAuth.authorize(credential, undefined, { abortOnPopupClose: true });

			if (!connected) return false;
			managerCredentialId.value = id;
			await load();
			return true;
		} finally {
			// Only for a credential the helper never saw -- the lookup above threw.
			// Past that point the helper deletes it itself on every path that is
			// not a completed sign-in, and a second DELETE answers 404.
			//
			// Caught because this runs while that error is on its way out: a
			// failed tidy-up must not take the place of the reason we are here.
			if (createdCredentialId && !reachedOAuth) {
				await credentialsStore.deleteCredential({ id: createdCredentialId }).catch(() => {});
			}
		}
	}

	async function provisionApp() {
		// Before the agent is written: refusing after it would leave a draft
		// persisted for a step that never ran.
		const managerCredentialId = requireManagerCredential();
		// A sign-in already on the project is selected on load, so this step can
		// be the first one the user presses -- and the backend reads the agent by
		// id, which a draft does not have yet.
		await context.ensureAgentPersisted?.();

		const requestedFor = contextKey();
		const app = await provisionTeamsApp(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			managerCredentialId,
		);
		if (requestedFor !== contextKey()) return;
		provisionedApp.value = app;

		// The Entra app is what names the organisation, so the Connect summary
		// only becomes accurate once this has run.
		await load();

		// Re-captured: `load()` can reselect the sign-in, and the app above is
		// still the one this call made.
		const readFor = contextKey();
		// Read once here so the bot step can offer the manual rungs without a
		// second round trip when no subscription turns up.
		const setupState = await getTeamsSetupState(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			app.credentialId,
		);
		if (readFor !== contextKey()) return;
		botSetupState.value = setupState;
	}

	async function loadSubscriptions() {
		const requestedFor = contextKey();
		const available = await getTeamsAzureSubscriptions(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			requireManagerCredential(),
		);
		if (requestedFor !== contextKey()) return;
		subscriptions.value = available;
	}

	async function provisionBot(subscriptionId: string) {
		const requestedFor = contextKey();
		const bot = await provisionTeamsBot(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			{
				managerCredentialId: requireManagerCredential(),
				credentialId: requireProvisionedCredential(),
				subscriptionId,
			},
		);
		if (requestedFor !== contextKey()) return;
		provisionedBot.value = bot;
	}

	async function publishApp(settings?: AgentTeamsIntegrationSettings) {
		// The slowest call here -- it uploads the package -- so the most likely
		// to land after the account or the agent moved on.
		const requestedFor = contextKey();
		const state = await publishTeamsApp(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			{
				managerCredentialId: requireManagerCredential(),
				credentialId: requireProvisionedCredential(),
				settings,
			},
		);
		if (requestedFor !== contextKey()) return;
		catalogState.value = state;
	}

	async function refreshCatalogState() {
		const askedWith = managerCredentialId.value;
		if (!askedWith) return;
		// `load()` fires this without awaiting it, and `load()` itself runs from
		// three places -- so several reads can be in flight at once, each able to
		// answer about a different tenant.
		const requestedFor = contextKey();
		const state = await getTeamsCatalogState(
			rootStore.restApiContext,
			context.projectId.value,
			context.agentId.value,
			askedWith,
			channelCredentialId(),
		);
		if (requestedFor !== contextKey()) return;

		// `unknown` means the catalogue could not answer, not that the app is
		// gone -- and for minutes after a publish that is the only answer it
		// gives. Letting it overwrite a state we watched Microsoft report sends
		// the step back to offering a publish that has already happened, which
		// Microsoft then refuses as a duplicate.
		if (
			state.status === 'unknown' &&
			catalogState.value &&
			catalogState.value.status !== 'unknown'
		) {
			return;
		}
		catalogState.value = state;
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
		catalogState,
		connectedCredentialId,
		provisionApp,
		loadSubscriptions,
		provisionBot,
		publishApp,
		refreshCatalogState,
	};
}
