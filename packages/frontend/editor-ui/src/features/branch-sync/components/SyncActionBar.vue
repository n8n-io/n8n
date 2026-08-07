<script lang="ts" setup>
import { N8nButton, N8nCallout, N8nNotice, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { PlanResponse } from '@/features/branch-sync/branchSync.types';

const props = defineProps<{
	plan: PlanResponse;
	/** Paths selected for a partial apply; empty = full sync. */
	selection: string[];
	/** Number of conflict rows still without an explicit choice. */
	unresolvedCount: number;
	syncing: boolean;
}>();

const emit = defineEmits<{
	sync: [];
}>();

const i18n = useI18n();

const isPartial = computed(() => props.selection.length > 0);

const actionable = computed(() =>
	props.plan.decisions.some((d) => d.kind !== 'converged' && d.kind !== 'skipped'),
);

// Converged-but-base-behind: nothing to apply, but the stored base lags the
// reconcile target (e.g. head moved via a proposal merge). Syncing here applies
// nothing to live and pushes nothing — it just fast-forwards the base pointer.
const canFastForward = computed(
	() => !actionable.value && props.plan.baseAdvances && props.plan.base !== props.plan.target,
);

const canSync = computed(() => actionable.value || canFastForward.value);

const buttonLabel = computed(() => {
	if (isPartial.value) {
		return i18n.baseText('branchSync.sync.applySelected', {
			interpolate: { count: String(props.selection.length) },
		});
	}
	if (canFastForward.value) return i18n.baseText('branchSync.sync.fastForward');
	return props.plan.role === 'destination'
		? i18n.baseText('branchSync.sync.pull')
		: i18n.baseText('branchSync.sync.reconcilePush');
});

const theme = computed(() => {
	if (props.plan.pushBlocked || props.unresolvedCount > 0) return 'warning';
	if (!canSync.value) return 'success';
	return 'info';
});

const message = computed(() => {
	if (props.unresolvedCount > 0) {
		return i18n.baseText('branchSync.sync.conflictsRemaining', {
			interpolate: { count: String(props.unresolvedCount) },
		});
	}
	if (!actionable.value) {
		return canFastForward.value
			? i18n.baseText('branchSync.sync.baseBehind')
			: i18n.baseText('branchSync.sync.upToDate');
	}
	return props.plan.role === 'destination'
		? i18n.baseText('branchSync.sync.pendingPull')
		: i18n.baseText('branchSync.sync.pendingPush');
});
</script>

<template>
	<div :class="$style.bar" data-test-id="branch-sync-action-bar">
		<N8nCallout :theme="theme" icon="git-branch">
			<N8nText size="small">{{ message }}</N8nText>
			<template #trailingContent>
				<N8nButton
					:label="buttonLabel"
					:loading="syncing"
					:disabled="!canSync"
					size="small"
					data-test-id="branch-sync-sync-button"
					@click="emit('sync')"
				/>
			</template>
		</N8nCallout>
		<N8nNotice
			v-if="isPartial"
			theme="warning"
			:content="i18n.baseText('branchSync.sync.partialNotice')"
		/>
		<N8nNotice
			v-if="plan.errors.length > 0"
			theme="danger"
			:content="
				i18n.baseText('branchSync.detail.errors', {
					interpolate: {
						count: String(plan.errors.length),
						paths: plan.errors.map((e) => e.path).join(', '),
					},
				})
			"
		/>
	</div>
</template>

<style lang="scss" module>
.bar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
