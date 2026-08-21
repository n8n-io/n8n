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
	/**
	 * Channel types the server has actually answered for. A failed refetch must
	 * not overwrite what the server said, but it must not protect a guess either:
	 * the builder seeds this cache from local configuration alone, and treating
	 * that as an answer would leave the UI showing "Starting…" for a channel
	 * nobody has asked about yet.
	 */
	serverConfirmed: Ref<Set<string>>;
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
			serverConfirmed: ref(new Set()),
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
 *
 * `source` settles who wins where the two disagree. Configuration is the
 * authority on which channels exist and what backs them; only the status
 * endpoint knows whether one is actually running. So a `config` pass refreshes
 * credentials and settings but leaves the status of a channel the server has
 * already answered for alone — otherwise any builder write, which re-seeds this
 * cache, would downgrade a channel known to be `connected` (or known to have
 * failed, losing its reason with it) to the local `starting` guess, and nothing
 * on that path refetches to put it back.
 */
function applyStatus(
	state: AgentIntegrationStatusState,
	integrationTypes: readonly string[],
	integrations: AgentIntegrationStatusEntry[],
	source: 'server' | 'config',
): void {
	const fromServer = source === 'server';
	const previousStatuses = { ...state.statuses.value };
	const previousRuntimeErrors = { ...state.runtimeErrors.value };
	// An answer of `disconnected` was about a channel that did not exist then. If
	// configuration has one now, the seed is the fresher account of it.
	const answeredFor = (type: string) =>
		state.serverConfirmed.value.has(type) &&
		previousStatuses[type] !== 'disconnected' &&
		previousStatuses[type] !== 'unknown';

	for (const type of integrationTypes) {
		state.statuses.value[type] = 'disconnected';
		state.connectedCredentials.value[type] = '';
		state.integrationSettings.value[type] = undefined;
		state.runtimeErrors.value[type] = '';
	}
	for (const integration of integrations) {
		// Only `starting` is the seed guessing at runtime state, and only a guess
		// has to give way. `configured` is the seed saying the agent is unpublished,
		// which is configuration's own fact and outranks any earlier answer — the
		// channels of an unpublished agent are not running, whatever they were doing
		// before it was unpublished.
		const keepServerAnswer =
			!fromServer && integration.status === 'starting' && answeredFor(integration.type);
		state.statuses.value[integration.type] = keepServerAnswer
			? previousStatuses[integration.type]
			: integration.status;
		state.connectedCredentials.value[integration.type] =
			typeof integration.credentialId === 'string' ? integration.credentialId : '';
		state.integrationSettings.value[integration.type] = integration.settings;
		state.runtimeErrors.value[integration.type] = keepServerAnswer
			? (previousRuntimeErrors[integration.type] ?? '')
			: (integration.errorMessage ?? '');
	}
	for (const type of integrationTypes) {
		if (fromServer) {
			state.serverConfirmed.value.add(type);
			continue;
		}
		// A channel configuration no longer has is gone whatever the server last
		// said about it, so its answer goes with it.
		if (!integrations.some((integration) => integration.type === type)) {
			state.serverConfirmed.value.delete(type);
		}
	}
}

export function syncAgentIntegrationStatusCache(
	projectId: string,
	agentId: string,
	integrationTypes: readonly string[],
	integrations: AgentIntegrationStatusEntry[],
): void {
	// Seeded from the agent's own configuration, not from the status endpoint.
	applyStatus(getOrCreate(projectId, agentId), integrationTypes, integrations, 'config');
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
				applyStatus(state, integrationTypes, result.integrations ?? [], 'server');
			} catch {
				// Mark only types the server hasn't answered for as `unknown` — a
				// transient network failure shouldn't claim that a channel the server
				// already told us about is now disconnected, and shouldn't dress up a
				// locally-seeded guess as an answer either.
				for (const type of integrationTypes) {
					if (!state.serverConfirmed.value.has(type)) {
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
			// The server answered for this channel, even though it was a mutation
			// rather than a status read — a later failed refetch must not downgrade it.
			state.serverConfirmed.value.add(type);
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
			state.serverConfirmed.value.add(type);
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
		return (['configured', 'starting', 'connected', 'error'] as Status[]).includes(
			state.statuses.value[type],
		);
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
