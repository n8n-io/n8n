import type {
	ScimConfigResponse,
	ScimDataAction,
	ScimOnDelete,
	ScimTransferTargetType,
	ScimTransferTargetsResponse,
} from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	fetchScimTransferTargets,
	generateScimToken,
	getScimConfig,
	revokeScimToken,
	updateScimConfig,
	type ScimConfigPatch,
	type ScimTransferTargetsQuery,
} from './scim.api';
import { SCIM_STORE } from './scim.constants';

/**
 * Where the SCIM page stands, in the order the page checks it.
 * - `needs_sso`: SAML or OIDC login is off, so SCIM cannot be enabled.
 * - `off`: SCIM provisioning is disabled.
 * - `no_token`: enabled, but the instance has no token.
 * - `waiting`, `connected`, `error`: the backend connection status.
 */
export type ScimPageState = 'needs_sso' | 'off' | 'no_token' | 'waiting' | 'connected' | 'error';

/**
 * The store status: the backend connection status, plus the two states that
 * come before a connection can exist.
 */
export type ScimStatus = 'disabled' | 'no-token' | 'waiting' | 'connected' | 'error';

export const useScimStore = defineStore(SCIM_STORE, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const config = ref<ScimConfigResponse | null>(null);
	const loading = ref(false);
	/**
	 * The token value from the last `POST /rest/scim/token`. The backend returns
	 * it once. It lives in memory only: never in browser storage, never in logs.
	 */
	const revealedToken = ref<string | null>(null);
	/**
	 * Shows the "connected" callout after the page saw the status change from
	 * waiting to connected in this app session. An instance that was connected
	 * before the session never shows it.
	 */
	const connectedCallout = ref(false);

	/** The SCIM UI shows only while the module is active and the pre-GA opt-in is on. */
	const isScimUiEnabled = computed(() =>
		Boolean(settingsStore.isModuleActive('scim') && settingsStore.moduleSettings.scim?.available),
	);

	const optInSource = computed(() => settingsStore.moduleSettings.scim?.optInSource ?? null);

	/**
	 * SCIM needs single sign-on. The module cannot import the SSO store, so it
	 * reads the frontend settings. `settingsStore.getSettings()` refreshes them.
	 */
	const isSsoEnabled = computed(() => {
		const sso = settingsStore.settings.sso;
		return Boolean(sso?.saml?.loginEnabled || sso?.oidc?.loginEnabled);
	});

	const isEnabled = computed(() => config.value?.enabled === true);
	const hasToken = computed(() => config.value?.hasToken === true);

	const status = computed<ScimStatus>(() => {
		if (!config.value?.enabled) return 'disabled';
		if (!config.value.hasToken) return 'no-token';
		return config.value.status;
	});

	const pageState = computed<ScimPageState>(() => {
		if (!isSsoEnabled.value) return 'needs_sso';
		if (!config.value?.enabled) return 'off';
		if (!config.value.hasToken) return 'no_token';
		return config.value.status;
	});

	/** Mirror the fields the SSO page reads, so its SCIM row is right without a reload. */
	function syncModuleSettings(update: { scimEnabled?: boolean; hasToken?: boolean }) {
		const current = settingsStore.moduleSettings.scim;
		if (!current) return;
		settingsStore.moduleSettings.scim = { ...current, ...update };
	}

	function applyConfig(next: ScimConfigResponse) {
		const wasWaiting = config.value?.status === 'waiting' && config.value.hasToken;
		config.value = next;
		if (wasWaiting && next.enabled && next.hasToken && next.status === 'connected') {
			connectedCallout.value = true;
		}
		syncModuleSettings({ scimEnabled: next.enabled, hasToken: next.hasToken });
	}

	async function fetchConfig(): Promise<ScimConfigResponse> {
		loading.value = true;
		try {
			const fetched = await getScimConfig(rootStore.restApiContext);
			applyConfig(fetched);
			return fetched;
		} finally {
			loading.value = false;
		}
	}

	/** Saves one or more fields, then reloads the config so derived fields stay in sync. */
	async function patchConfig(patch: ScimConfigPatch): Promise<ScimConfigResponse> {
		await updateScimConfig(rootStore.restApiContext, patch);
		return await fetchConfig();
	}

	/**
	 * Turns SCIM on. A kept token is reused: a new one would break the
	 * identity provider's connection. Without a token, one is generated.
	 */
	async function enable(): Promise<void> {
		await updateScimConfig(rootStore.restApiContext, { enabled: true });
		if (!config.value?.hasToken) {
			await generateToken();
			return;
		}
		await fetchConfig();
	}

	/** Turns SCIM off. The backend keeps the token and the deprovisioning policy. */
	async function disable(): Promise<void> {
		connectedCallout.value = false;
		revealedToken.value = null;
		await patchConfig({ enabled: false });
	}

	/** Generates the first token, or rotates the current one. Keeps the value in memory for this view. */
	async function generateToken(): Promise<void> {
		connectedCallout.value = false;
		const { token } = await generateScimToken(rootStore.restApiContext);
		revealedToken.value = token;
		await fetchConfig();
	}

	async function revokeToken(): Promise<void> {
		connectedCallout.value = false;
		revealedToken.value = null;
		await revokeScimToken(rootStore.restApiContext);
		await fetchConfig();
	}

	/** Forgets the revealed token. The page calls this when it unmounts. */
	function clearRevealedToken() {
		revealedToken.value = null;
	}

	function dismissConnectedCallout() {
		connectedCallout.value = false;
	}

	async function setDeprovisioning(policy: {
		onDelete?: ScimOnDelete;
		dataAction?: ScimDataAction;
		transferProjectId?: string | null;
	}): Promise<ScimConfigResponse> {
		return await patchConfig(policy);
	}

	async function searchTransferTargets(
		query: { search?: string; type?: ScimTransferTargetType; skip?: number; take?: number } = {},
	): Promise<ScimTransferTargetsResponse> {
		const params: ScimTransferTargetsQuery = {};
		if (query.search) params.search = query.search;
		if (query.type) params.type = query.type;
		if (query.skip !== undefined) params.skip = query.skip;
		if (query.take !== undefined) params.take = query.take;
		return await fetchScimTransferTargets(rootStore.restApiContext, params);
	}

	return {
		config,
		loading,
		revealedToken,
		connectedCallout,
		isScimUiEnabled,
		optInSource,
		isSsoEnabled,
		isEnabled,
		hasToken,
		status,
		pageState,
		fetchConfig,
		enable,
		disable,
		generateToken,
		revokeToken,
		clearRevealedToken,
		dismissConnectedCallout,
		setDeprovisioning,
		searchTransferTargets,
	};
});
