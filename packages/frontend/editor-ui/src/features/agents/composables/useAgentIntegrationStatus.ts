import { ref, type Ref } from 'vue';
import type { AgentIntegrationStatusEntry } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

import { connectIntegration, disconnectIntegration, getIntegrationStatus } from './useAgentApi';

type Status = 'connected' | 'disconnected' | 'unknown';

interface AgentIntegrationStatusState {
	statuses: Ref<Record<string, Status>>;
	connectedCredentials: Ref<Record<string, string>>;
	loadingMap: Ref<Record<string, boolean>>;
	errorMessages: Ref<Record<string, string>>;
	errorIsConflict: Ref<Record<string, boolean>>;
	fetchInFlight: Promise<void> | null;
}

/**
 * Module-level cache keyed by `${projectId}:${agentId}` so every caller
 * (Triggers panel, Add-Trigger modal, future surfaces) sees the same
 * reactive state. When one caller connects/disconnects an integration, the
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
			loadingMap: ref({}),
			errorMessages: ref({}),
			errorIsConflict: ref({}),
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

function applyStatus(
	state: AgentIntegrationStatusState,
	integrationTypes: readonly string[],
	integrations: AgentIntegrationStatusEntry[],
): void {
	for (const type of integrationTypes) {
		state.statuses.value[type] = 'disconnected';
		state.connectedCredentials.value[type] = '';
	}
	for (const integration of integrations) {
		state.statuses.value[integration.type] = 'connected';
		state.connectedCredentials.value[integration.type] =
			typeof integration.credentialId === 'string' ? integration.credentialId : '';
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
				// a previously-connected integration is now disconnected.
				for (const type of integrationTypes) {
					if (state.statuses.value[type] !== 'connected') {
						state.statuses.value[type] = 'unknown';
					}
				}
			} finally {
				state.fetchInFlight = null;
			}
		})();
		await state.fetchInFlight;
	}

	async function connect(type: string, credId: string): Promise<void> {
		state.loadingMap.value[type] = true;
		state.errorMessages.value[type] = '';
		state.errorIsConflict.value[type] = false;
		try {
			await connectIntegration(rootStore.restApiContext, projectId, agentId, type, credId);
			// Reflect the change in the shared reactive state immediately so the
			// other consumer re-renders without waiting for a round-trip refetch.
			state.statuses.value[type] = 'connected';
			state.connectedCredentials.value[type] = credId;
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

	async function disconnect(type: string, credId: string): Promise<void> {
		state.loadingMap.value[type] = true;
		try {
			await disconnectIntegration(rootStore.restApiContext, projectId, agentId, type, credId);
			state.statuses.value[type] = 'disconnected';
			state.connectedCredentials.value[type] = '';
		} finally {
			state.loadingMap.value[type] = false;
		}
	}

	function isConnected(type: string): boolean {
		return state.statuses.value[type] === 'connected';
	}

	return {
		statuses: state.statuses,
		connectedCredentials: state.connectedCredentials,
		loadingMap: state.loadingMap,
		errorMessages: state.errorMessages,
		errorIsConflict: state.errorIsConflict,
		fetchStatus,
		connect,
		disconnect,
		isConnected,
	};
}
