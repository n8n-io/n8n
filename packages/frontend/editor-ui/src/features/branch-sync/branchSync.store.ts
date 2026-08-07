import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as branchSyncApi from './branchSync.api';
import type {
	CommitInfo,
	ConflictChoices,
	ConnectScopePayload,
	PlanResponse,
	ProposalStatus,
	ScopeSummary,
	SyncPayload,
} from './branchSync.types';

/**
 * Branch-sync state. No push events exist for this module, so freshness comes
 * from `refreshScope` after every mutating action. Errors are deliberately not
 * caught here — components toast them (promotions POC pattern).
 */
export const useBranchSyncStore = defineStore('branchSync', () => {
	const rootStore = useRootStore();

	const scopes = ref<ScopeSummary[]>([]);
	const selectedScopeKey = ref<string | null>(null);
	const plans = ref<Record<string, PlanResponse>>({});
	const commits = ref<Record<string, CommitInfo[]>>({});
	const proposalStatuses = ref<Record<string, ProposalStatus>>({});
	const loading = ref(false);
	const initialized = ref(false);

	const selected = computed(
		() => scopes.value.find((scope) => scope.scopeKey === selectedScopeKey.value) ?? null,
	);
	const selectedPlan = computed(() =>
		selectedScopeKey.value ? (plans.value[selectedScopeKey.value] ?? null) : null,
	);

	const proposalStatusKey = (scopeKey: string, name: string) => `${scopeKey}//${name}`;

	async function fetchScopes() {
		loading.value = !initialized.value;
		try {
			scopes.value = await branchSyncApi.fetchScopes(rootStore.restApiContext);
			initialized.value = true;
			if (selectedScopeKey.value && !selected.value) selectedScopeKey.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function connect(payload: ConnectScopePayload) {
		const scope = await branchSyncApi.connectScope(rootStore.restApiContext, payload);
		await fetchScopes();
		selectedScopeKey.value = scope.scopeKey;
		return scope;
	}

	async function fetchPlan(scopeKey: string, to?: string) {
		plans.value[scopeKey] = await branchSyncApi.fetchPlan(rootStore.restApiContext, scopeKey, to);
		return plans.value[scopeKey];
	}

	async function fetchCommits(scopeKey: string) {
		commits.value[scopeKey] = await branchSyncApi.fetchCommits(rootStore.restApiContext, scopeKey);
		return commits.value[scopeKey];
	}

	async function sync(scopeKey: string, payload: SyncPayload) {
		return await branchSyncApi.syncScope(rootStore.restApiContext, scopeKey, payload);
	}

	/** Re-fetch everything the detail pane shows for one scope. */
	async function refreshScope(scopeKey: string, to?: string) {
		await Promise.all([fetchScopes(), fetchPlan(scopeKey, to), fetchCommits(scopeKey)]);
	}

	async function fetchProposalStatus(scopeKey: string, name: string) {
		const status = await branchSyncApi.fetchProposalStatus(
			rootStore.restApiContext,
			scopeKey,
			name,
		);
		proposalStatuses.value[proposalStatusKey(scopeKey, name)] = status;
		return status;
	}

	function getProposalStatus(scopeKey: string, name: string): ProposalStatus | null {
		return proposalStatuses.value[proposalStatusKey(scopeKey, name)] ?? null;
	}

	async function createProposal(scopeKey: string, name: string, choices?: ConflictChoices) {
		const proposal = await branchSyncApi.createProposal(
			rootStore.restApiContext,
			scopeKey,
			name,
			choices,
		);
		await refreshScope(scopeKey);
		return proposal;
	}

	async function refreshProposal(scopeKey: string, name: string, choices?: ConflictChoices) {
		return await branchSyncApi.refreshProposal(rootStore.restApiContext, scopeKey, name, choices);
	}

	async function updateProposalFromLive(scopeKey: string, name: string, choices?: ConflictChoices) {
		return await branchSyncApi.updateProposalFromLive(
			rootStore.restApiContext,
			scopeKey,
			name,
			choices,
		);
	}

	async function mergeProposal(scopeKey: string, name: string) {
		return await branchSyncApi.mergeProposal(rootStore.restApiContext, scopeKey, name);
	}

	function select(scopeKey: string) {
		selectedScopeKey.value = scopeKey;
	}

	return {
		scopes,
		selectedScopeKey,
		selected,
		selectedPlan,
		plans,
		commits,
		proposalStatuses,
		loading,
		initialized,
		fetchScopes,
		connect,
		fetchPlan,
		fetchCommits,
		sync,
		refreshScope,
		fetchProposalStatus,
		getProposalStatus,
		createProposal,
		refreshProposal,
		updateProposalFromLive,
		mergeProposal,
		select,
	};
});
