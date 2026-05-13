/**
 * instanceAiIncremental store
 *
 * Light Pinia store that mirrors the incremental builder's live state
 * (phase, scope, checklist, draft, verifier report) from SSE events.
 *
 * Intentionally separate from the main `instanceAi` store — the
 * incremental builder is behind a feature flag and shouldn't touch the
 * existing reducer.
 */

import type {
	IncChecklist,
	IncDraftState,
	IncPhase,
	IncScopeSpec,
	IncVerifierReport,
	InstanceAiEvent,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

interface ThreadIncrementalState {
	phase: IncPhase;
	phaseMessage?: string;
	scope?: IncScopeSpec;
	checklist?: IncChecklist;
	draft?: IncDraftState;
	verifier?: IncVerifierReport;
}

function emptyState(): ThreadIncrementalState {
	return { phase: 'idle' };
}

export const useInstanceAiIncrementalStore = defineStore('instanceAiIncremental', () => {
	const byThread = ref<Record<string, ThreadIncrementalState>>({});

	function get(threadId: string): ThreadIncrementalState {
		return byThread.value[threadId] ?? emptyState();
	}

	function ensure(threadId: string): ThreadIncrementalState {
		if (!byThread.value[threadId]) {
			byThread.value[threadId] = emptyState();
		}
		return byThread.value[threadId];
	}

	function reset(threadId: string): void {
		delete byThread.value[threadId];
	}

	function ingest(threadId: string, event: InstanceAiEvent): void {
		switch (event.type) {
			case 'inc-phase-update': {
				const state = ensure(threadId);
				state.phase = event.payload.phase;
				state.phaseMessage = event.payload.message;
				return;
			}
			case 'inc-scope-update': {
				const state = ensure(threadId);
				state.scope = event.payload.scope;
				return;
			}
			case 'inc-checklist-update': {
				const state = ensure(threadId);
				state.checklist = event.payload.checklist;
				return;
			}
			case 'inc-draft-update': {
				const state = ensure(threadId);
				state.draft = event.payload.state;
				return;
			}
			case 'inc-verifier-report': {
				const state = ensure(threadId);
				state.verifier = event.payload;
				return;
			}
			case 'run-finish': {
				// Leave the snapshot in place; the user may want to scroll back.
				// Reset on the next run-start instead.
				return;
			}
			case 'run-start': {
				// Fresh run = fresh slate.
				byThread.value[threadId] = emptyState();
				return;
			}
			default:
				return;
		}
	}

	const isActive = (threadId: string) =>
		computed(() => {
			const state = byThread.value[threadId];
			if (!state) return false;
			return state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'blocked';
		});

	return { byThread, get, ingest, reset, isActive };
});
