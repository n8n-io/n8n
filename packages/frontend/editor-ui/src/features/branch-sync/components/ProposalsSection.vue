<script lang="ts" setup>
import { N8nBadge, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import { useBranchSyncStore } from '@/features/branch-sync/branchSync.store';
import type {
	ConflictChoices,
	Decision,
	ScopeSummary,
} from '@/features/branch-sync/branchSync.types';
import { shortSha } from '@/features/branch-sync/branchSync.utils';
import CreateProposalDialog from '@/features/branch-sync/components/CreateProposalDialog.vue';
import ProposalConflictDialog from '@/features/branch-sync/components/ProposalConflictDialog.vue';

const props = defineProps<{
	scope: ScopeSummary;
	/** Current plan choices, forwarded to proposal creation. */
	choices: ConflictChoices;
}>();

const i18n = useI18n();
const toast = useToast();
const store = useBranchSyncStore();

const showCreateDialog = ref(false);
const acting = ref<Record<string, boolean>>({});

type ProposalAction = 'refresh' | 'update-from-live';
const conflictDialog = ref<{ name: string; action: ProposalAction; conflicts: Decision[] } | null>(
	null,
);
const resolvingConflicts = ref(false);

const proposalNames = computed(() => Object.keys(props.scope.proposals));

watch(
	() => props.scope.scopeKey,
	async () => {
		await fetchStatuses();
	},
	{ immediate: true },
);

async function fetchStatuses() {
	await Promise.all(
		proposalNames.value.map(async (name) =>
			store.fetchProposalStatus(props.scope.scopeKey, name).catch(() => {
				// A stale proposal entry (deleted branch) must not break the section
			}),
		),
	);
}

function setActing(name: string, value: boolean) {
	acting.value = { ...acting.value, [name]: value };
}

async function runAction(name: string, action: ProposalAction, choices?: ConflictChoices) {
	setActing(name, true);
	try {
		const response =
			action === 'refresh'
				? await store.refreshProposal(props.scope.scopeKey, name, choices)
				: await store.updateProposalFromLive(props.scope.scopeKey, name, choices);

		if (response.conflicts?.length) {
			conflictDialog.value = { name, action, conflicts: response.conflicts };
			return;
		}
		conflictDialog.value = null;
		toast.showMessage({
			title:
				response.note ??
				i18n.baseText(
					action === 'refresh' ? 'branchSync.proposals.refreshed' : 'branchSync.proposals.updated',
					{ interpolate: { name, tip: shortSha(response.tip) } },
				),
			type: 'success',
		});
		await refresh(name);
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.proposal'));
	} finally {
		setActing(name, false);
	}
}

async function onResolveConflicts(choices: ConflictChoices) {
	if (!conflictDialog.value) return;
	resolvingConflicts.value = true;
	try {
		await runAction(conflictDialog.value.name, conflictDialog.value.action, choices);
	} finally {
		resolvingConflicts.value = false;
	}
}

async function onMerge(name: string) {
	setActing(name, true);
	try {
		const { merged } = await store.mergeProposal(props.scope.scopeKey, name);
		toast.showMessage({
			title: i18n.baseText('branchSync.proposals.merged', {
				interpolate: { name, sha: shortSha(merged) },
			}),
			type: 'success',
		});
		await store.refreshScope(props.scope.scopeKey);
	} catch (error) {
		// The up-to-date gate rejects merges of stale proposals with a 409.
		toast.showError(error, i18n.baseText('branchSync.proposals.mergeBlocked'));
		await refresh(name);
	} finally {
		setActing(name, false);
	}
}

async function refresh(name: string) {
	await Promise.all([
		store.fetchProposalStatus(props.scope.scopeKey, name).catch(() => {}),
		store.refreshScope(props.scope.scopeKey),
	]);
}
</script>

<template>
	<section :class="$style.section" data-test-id="branch-sync-proposals">
		<div :class="$style.header">
			<N8nText bold size="medium">{{ i18n.baseText('branchSync.proposals.title') }}</N8nText>
			<N8nButton
				size="small"
				icon="plus"
				type="secondary"
				:label="i18n.baseText('branchSync.proposals.create')"
				data-test-id="branch-sync-new-proposal-button"
				@click="showCreateDialog = true"
			/>
		</div>

		<N8nText v-if="proposalNames.length === 0" color="text-light" size="small">
			{{ i18n.baseText('branchSync.proposals.empty') }}
		</N8nText>

		<ul v-else :class="$style.list">
			<li
				v-for="name in proposalNames"
				:key="name"
				:class="$style.row"
				data-test-id="branch-sync-proposal-row"
			>
				<div :class="$style.rowInfo">
					<N8nText size="small" bold>{{ name }}</N8nText>
					<template v-if="store.getProposalStatus(scope.scopeKey, name)">
						<N8nBadge
							v-if="store.getProposalStatus(scope.scopeKey, name)?.behindTarget"
							theme="warning"
							size="small"
						>
							{{ i18n.baseText('branchSync.proposals.behind') }}
						</N8nBadge>
						<N8nBadge v-else theme="success" size="small">
							{{ i18n.baseText('branchSync.proposals.mergeable') }}
						</N8nBadge>
						<N8nTooltip :content="scope.proposals[name].paths.join(', ')" placement="top">
							<N8nText size="xsmall" color="text-light">
								{{
									i18n.baseText('branchSync.proposals.paths', {
										interpolate: { count: String(scope.proposals[name].paths.length) },
									})
								}}
							</N8nText>
						</N8nTooltip>
						<N8nText size="xsmall" color="text-light" :class="$style.sha">
							{{ shortSha(store.getProposalStatus(scope.scopeKey, name)?.tip) }}
						</N8nText>
					</template>
				</div>
				<div :class="$style.rowActions">
					<N8nButton
						size="small"
						type="secondary"
						:label="i18n.baseText('branchSync.proposals.refresh')"
						:loading="acting[name]"
						data-test-id="branch-sync-proposal-refresh"
						@click="runAction(name, 'refresh')"
					/>
					<N8nButton
						size="small"
						type="secondary"
						:label="i18n.baseText('branchSync.proposals.updateFromLive')"
						:loading="acting[name]"
						data-test-id="branch-sync-proposal-update"
						@click="runAction(name, 'update-from-live')"
					/>
					<N8nButton
						size="small"
						:label="i18n.baseText('branchSync.proposals.merge')"
						:loading="acting[name]"
						:disabled="store.getProposalStatus(scope.scopeKey, name)?.behindTarget === true"
						data-test-id="branch-sync-proposal-merge"
						@click="onMerge(name)"
					/>
				</div>
			</li>
		</ul>

		<CreateProposalDialog
			v-model:open="showCreateDialog"
			:scope-key="scope.scopeKey"
			:choices="choices"
		/>
		<ProposalConflictDialog
			:open="conflictDialog !== null"
			:conflicts="conflictDialog?.conflicts ?? []"
			:submitting="resolvingConflicts"
			@update:open="conflictDialog = $event ? conflictDialog : null"
			@submit="onResolveConflicts"
		/>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--md);
	border-top: var(--border);
	margin-top: var(--spacing--md);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
}

.rowInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex-wrap: wrap;
}

.rowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.sha {
	font-family: var(--font-family--monospace);
}
</style>
