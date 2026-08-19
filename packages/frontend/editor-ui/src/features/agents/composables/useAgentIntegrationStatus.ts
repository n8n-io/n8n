import { ref, type Ref } from 'vue';
import type {
	AgentChannelRuntimeStatus,
	AgentDisconnectIntegrationResponse,
	AgentIntegrationConnectResponse,
	AgentIntegrationStatusEntry,
	AgentIntegrationSettings,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	connectIntegration,
	disconnectIntegration,
	getIntegrationStatus,
	type ConnectIntegrationOptions,
} from './useAgentApi';

/**
 * Per-channel state, plus the two answers only the client can give:
 * `disconnected` for a channel that isn't set up at all, and `unknown` when we
 * failed to ask.
 */
type Status = AgentChannelRuntimeStatus | 'disconnected' | 'unknown';

/** Statuses that came from the server, so a failed refetch must not overwrite them. */
const CONFIRMED_STATUSES: readonly Status[] = ['configured', 'starting', 'connected', 'error'];

interface AgentIntegrationStatusState {
	statuses: Ref<Record<string, Status>>;
	connectedCredentials: Ref<Record<string, string>>;
	integrationSettings: Ref<Record<string, AgentIntegrationSettings | undefined>>;
	loadingMap: Ref<Record<string, boolean>>;
	errorMessages: Ref<Record<string, string>>;
	errorIsConflict: Ref<Record<string, boolean>>;
	/**
	 * Why a channel isn't running, from the server. Kept apart from
	 * `errorMessages`, which holds what the setup form's last attempt said — the
	 * two have different lifetimes and are shown in different places.
	 */
	runtimeErrors: Ref<Record<string, string>>;
	fetchInFlight: Promise<void> | null;
}

/**
 * Module-level cache keyed by `${projectId}:${agentId}` so every caller
 * (Triggers panel, Add-Trigger modal, future surfaces) sees the same
 * reactive state. When one caller configures/disconnects an integration, the
 * other renders automatically — no events, no prop-drilling.
 */
const cache = new Map<string, AgentIntegrationStatusState>();

function getOrCreate(projectId: string, agentId: string): AgentIntegrationStatusState {
	const key = `${projectId}:${agentId}`;
	let state = cache.get(key);
	if (!state) {
		state = {
			statuses: ref({}),
			connectedCredentials: ref({}),
			integrationSettings: ref({}),
			loadingMap: ref({}),
			errorMessages: ref({}),
			errorIsConflict: ref({}),
			runtimeErrors: ref({}),
			fetchInFlight: null,
		};
		cache.set(key, state);
	}
	return state;
}

/** Wipe the cache for an agent — use when an agent is deleted or the builder unmounts. */
export function clearAgentIntegrationStatusCache(projectId: string, agentId: string): void {
	cache.delete(`${projectId}:${agentId}`);
}

/**
 * Each entry carries its own status, so a mix of a running channel and a broken
 * one renders as exactly that — the response rollup is only for callers that
 * want one word for the whole agent.
 */
function applyStatus(
	state: AgentIntegrationStatusState,
	integrationTypes: readonly string[],
	integrations: AgentIntegrationStatusEntry[],
): void {
	for (const type of integrationTypes) {
		state.statuses.value[type] = 'disconnected';
		state.connectedCredentials.value[type] = '';
		state.integrationSettings.value[type] = undefined;
		state.runtimeErrors.value[type] = '';
	}
	for (const integration of integrations) {
		state.statuses.value[integration.type] = integration.status;
		state.connectedCredentials.value[integration.type] =
			typeof integration.credentialId === 'string' ? integration.credentialId : '';
		state.integrationSettings.value[integration.type] = integration.settings;
		state.runtimeErrors.value[integration.type] = integration.errorMessage ?? '';
	}
}

export function syncAgentIntegrationStatusCache(
	projectId: string,
	agentId: string,
	integrationTypes: readonly string[],
	integrations: AgentIntegrationStatusEntry[],
): void {
	applyStatus(getOrCreate(projectId, agentId), integrationTypes, integrations);
}

export function useAgentIntegrationStatus(projectId: string, agentId: string) {
	const rootStore = useRootStore();
	const state = getOrCreate(projectId, agentId);

	async function fetchStatus(integrationTypes: string[]): Promise<void> {
		// Dedupe concurrent fetches — mounting both consumers at once shouldn't
		// fire two requests.
		if (state.fetchInFlight) {
			await state.fetchInFlight;
			return;
		}
		state.fetchInFlight = (async () => {
			try {
				const result = await getIntegrationStatus(rootStore.restApiContext, projectId, agentId);
				applyStatus(state, integrationTypes, result.integrations ?? []);
			} catch {
				// Mark only types we don't already have a confirmed answer for as
				// `unknown` — a transient network/API failure shouldn't claim that
				// a channel the server already told us about is now disconnected.
				for (const type of integrationTypes) {
					if (!CONFIRMED_STATUSES.includes(state.statuses.value[type])) {
						state.statuses.value[type] = 'unknown';
					}
				}
			} finally {
				state.fetchInFlight = null;
			}
		})();
		await state.fetchInFlight;
	}

	async function connect(
		type: string,
		credId: string,
		settings?: AgentIntegrationSettings,
		options?: ConnectIntegrationOptions,
	): Promise<AgentIntegrationConnectResponse> {
		state.loadingMap.value[type] = true;
		state.errorMessages.value[type] = '';
		state.errorIsConflict.value[type] = false;
		try {
			const result = await connectIntegration(
				rootStore.restApiContext,
				projectId,
				agentId,
				type,
				credId,
				settings,
				options,
			);
			// Reflect the change in the shared reactive state immediately so the
			// other consumer re-renders without waiting for a round-trip refetch.
			state.statuses.value[type] = result.status;
			state.connectedCredentials.value[type] = credId;
			state.integrationSettings.value[type] = settings;
			// The channel just started, so whatever it failed with before is history.
			state.runtimeErrors.value[type] = '';
			return result;
		} catch (e: unknown) {
			const msg =
				e instanceof Error
					? e.message
					: typeof e === 'object' && e !== null && 'message' in e
						? String((e as { message: unknown }).message)
						: 'Failed to connect';
			state.errorMessages.value[type] = msg;
			state.errorIsConflict.value[type] = e instanceof ResponseError && e.httpStatusCode === 409;
			throw e;
		} finally {
			state.loadingMap.value[type] = false;
		}
	}

	async function disconnect(
		type: string,
		credId: string,
		options: { deleteExternalResource?: boolean } = {},
	): Promise<AgentDisconnectIntegrationResponse> {
		state.loadingMap.value[type] = true;
		try {
			const result = await disconnectIntegration(
				rootStore.restApiContext,
				projectId,
				agentId,
				type,
				credId,
				options.deleteExternalResource,
			);
			state.statuses.value[type] = 'disconnected';
			state.connectedCredentials.value[type] = '';
			state.integrationSettings.value[type] = undefined;
			state.runtimeErrors.value[type] = '';
			return result;
		} finally {
			state.loadingMap.value[type] = false;
		}
	}

	function isConnected(type: string): boolean {
		return state.statuses.value[type] === 'connected';
	}

	/** Set up, whether or not it is currently running. */
	function isConfigured(type: string): boolean {
		return CONFIRMED_STATUSES.includes(state.statuses.value[type]);
	}

	/** Should be running and is not — the last startup attempt failed. */
	function hasRuntimeError(type: string): boolean {
		return state.statuses.value[type] === 'error';
	}

	/** Should be running, with no attempt reported back yet. */
	function isStarting(type: string): boolean {
		return state.statuses.value[type] === 'starting';
	}

	function clearError(type: string): void {
		state.errorMessages.value[type] = '';
		state.errorIsConflict.value[type] = false;
	}

	return {
		statuses: state.statuses,
		connectedCredentials: state.connectedCredentials,
		integrationSettings: state.integrationSettings,
		loadingMap: state.loadingMap,
		errorMessages: state.errorMessages,
		errorIsConflict: state.errorIsConflict,
		runtimeErrors: state.runtimeErrors,
		fetchStatus,
		connect,
		disconnect,
		clearError,
		isConnected,
		isConfigured,
		hasRuntimeError,
		isStarting,
	};
}
