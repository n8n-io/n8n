<script lang="ts" setup>
import { N8nBadge, N8nLoading, N8nText, N8nTooltip, useMessage } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import { useBranchSyncStore } from '@/features/branch-sync/branchSync.store';
import type { ConflictChoices, ScopeSummary } from '@/features/branch-sync/branchSync.types';
import { isDestructiveChoice, shortSha } from '@/features/branch-sync/branchSync.utils';
import CommitPicker from '@/features/branch-sync/components/CommitPicker.vue';
import PlanTable from '@/features/branch-sync/components/PlanTable.vue';
import ProposalsSection from '@/features/branch-sync/components/ProposalsSection.vue';
import SyncActionBar from '@/features/branch-sync/components/SyncActionBar.vue';

const props = defineProps<{
	scope: ScopeSummary;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const store = useBranchSyncStore();

// Choices and selection are ephemeral per plan render — a refetched plan resets them.
const choices = ref<ConflictChoices>({});
const selection = ref<string[]>([]);
const pinnedTo = ref<string | undefined>(undefined);
const syncing = ref(false);
const planLoading = ref(false);

const plan = computed(() => store.plans[props.scope.scopeKey] ?? null);
const commits = computed(() => store.commits[props.scope.scopeKey] ?? []);

const unresolvedCount = computed(
	() => (plan.value?.conflicts ?? []).filter((c) => !choices.value[c.path]).length,
);

const policyLabel = computed(() =>
	i18n.baseText(
		`branchSync.policy.${props.scope.policy === 'keep-live' ? 'keepLive' : props.scope.policy}` as BaseTextKey,
	),
);

watch(
	() => props.scope.scopeKey,
	async () => {
		pinnedTo.value = undefined;
		await loadPlan();
	},
	{ immediate: true },
);

watch(pinnedTo, async () => {
	await loadPlan();
});

async function loadPlan() {
	choices.value = {};
	selection.value = [];
	planLoading.value = true;
	try {
		await Promise.all([
			store.fetchPlan(props.scope.scopeKey, pinnedTo.value),
			store.fetchCommits(props.scope.scopeKey),
		]);
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.plan'));
	} finally {
		planLoading.value = false;
	}
}

async function onSync() {
	if (!plan.value) return;

	const destructive = plan.value.conflicts.filter((conflict) =>
		isDestructiveChoice(conflict, choices.value[conflict.path]),
	);
	if (destructive.length > 0) {
		const answer = await message.confirm(
			i18n.baseText('branchSync.sync.confirmDestructive.message', {
				interpolate: { names: destructive.map((d) => d.name ?? d.path).join(', ') },
			}),
			i18n.baseText('branchSync.sync.confirmDestructive.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('branchSync.sync.confirmDestructive.confirm'),
				confirmationCheckboxMessage: i18n.baseText('branchSync.sync.confirmDestructive.checkbox'),
			},
		);
		if (answer !== 'confirm') return;
	}

	syncing.value = true;
	try {
		const result = await store.sync(props.scope.scopeKey, {
			choices: Object.keys(choices.value).length > 0 ? choices.value : undefined,
			select: selection.value.length > 0 ? selection.value : undefined,
			to: pinnedTo.value,
		});
		toast.showMessage({
			title: i18n.baseText('branchSync.sync.success', {
				interpolate: {
					applied: String(result.applied.length),
					base: shortSha(result.newBase),
				},
			}),
			message: result.pushedCommit
				? i18n.baseText('branchSync.sync.pushed', {
						interpolate: { sha: shortSha(result.pushedCommit) },
					})
				: undefined,
			type: 'success',
		});
		if (result.failed.length > 0) {
			toast.showMessage({
				title: i18n.baseText('branchSync.sync.failed', {
					interpolate: {
						count: String(result.failed.length),
						paths: result.failed.map((f) => f.path).join(', '),
					},
				}),
				type: 'error',
			});
		}
		await store.refreshScope(props.scope.scopeKey, pinnedTo.value);
		choices.value = {};
		selection.value = [];
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.sync'));
	} finally {
		syncing.value = false;
	}
}
</script>

<template>
	<div :class="$style.detail" data-test-id="branch-sync-scope-detail">
		<div :class="$style.headerStrip">
			<div :class="$style.headerInfo">
				<N8nText size="small" color="text-light">{{ scope.repoUrl }}</N8nText>
				<N8nBadge theme="default" size="small">{{ scope.branch }}</N8nBadge>
				<N8nBadge :theme="scope.role === 'source' ? 'primary' : 'secondary'" size="small">
					{{
						i18n.baseText(
							scope.role === 'source' ? 'branchSync.role.source' : 'branchSync.role.destination',
						)
					}}
				</N8nBadge>
				<N8nBadge theme="default" size="small">
					{{ policyLabel }}
				</N8nBadge>
				<N8nTooltip
					:content="`${plan?.base ?? scope.baseCommit} → ${plan?.target ?? scope.head ?? ''}`"
					placement="bottom"
				>
					<N8nText size="xsmall" color="text-light" :class="$style.sha">
						{{ shortSha(plan?.base ?? scope.baseCommit) }} →
						{{ shortSha(plan?.target ?? scope.head) }}
					</N8nText>
				</N8nTooltip>
			</div>
			<div :class="$style.headerPin">
				<CommitPicker v-model="pinnedTo" :commits="commits" />
			</div>
		</div>

		<N8nLoading v-if="planLoading && !plan" :loading="true" :rows="3" />
		<template v-else-if="plan">
			<SyncActionBar
				:plan="plan"
				:selection="selection"
				:unresolved-count="unresolvedCount"
				:syncing="syncing"
				@sync="onSync"
			/>
			<PlanTable
				v-model:selection="selection"
				:decisions="plan.decisions"
				:choices="choices"
				@update:choices="choices = $event"
			/>
		</template>

		<ProposalsSection :scope="scope" :choices="choices" />
	</div>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}

.headerStrip {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.headerInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex-wrap: wrap;
}

.headerPin {
	width: 320px;
	flex-shrink: 0;
}

.sha {
	font-family: var(--font-family--monospace);
	white-space: nowrap;
}
</style>
