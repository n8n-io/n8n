<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * One-time nudge anchored to the "fix this" button of a failed execution.
 * The slot is the anchor. The store decides when to show it and remembers
 * a dismissal in local storage, so the coachmark never comes back after
 * the user has seen the feature once.
 */
const props = defineProps<{
	execution: ExecutionSummary;
}>();

const emit = defineEmits<{
	tryNow: [];
}>();

const i18n = useI18n();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();

const isOpen = computed(() => store.shouldShowCoachmark(props.execution));

const body = computed(() => {
	const workflow = workflowsListStore.getWorkflowById(props.execution.workflowId);
	const status = store.getWorkflowStatus(
		props.execution.workflowId,
		workflow?.homeProject?.id ?? null,
	);
	const autonomy = status.enrolled ? status.config.autonomy : 'review';
	return i18n.baseText('selfHealing.coachmark.body', {
		interpolate: { behaviour: i18n.baseText(`selfHealing.autonomy.${autonomy}.description`) },
	});
});

function onTryNow() {
	store.dismissCoachmark('forever');
	emit('tryNow');
}

function onNotNow() {
	store.dismissCoachmark('later');
}

function onClose() {
	store.dismissCoachmark('forever');
}
</script>

<template>
	<N8nPopover
		:open="isOpen"
		side="bottom"
		align="end"
		:side-offset="10"
		width="320px"
		show-arrow
		suppress-auto-focus
		:enable-scrolling="false"
		:content-class="$style.coachmark"
	>
		<template #trigger>
			<slot />
		</template>
		<template #content>
			<div :class="$style.header">
				<N8nText size="medium" bold :class="$style.title">
					{{ i18n.baseText('selfHealing.coachmark.title') }}
				</N8nText>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					:class="$style.close"
					:title="i18n.baseText('selfHealing.coachmark.dismiss')"
					data-test-id="self-healing-coachmark-close"
					@click="onClose"
				/>
			</div>
			<N8nText size="small" :class="$style.body">{{ body }}</N8nText>
			<div :class="$style.actions">
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('selfHealing.coachmark.notNow')"
					:class="$style.notNow"
					data-test-id="self-healing-coachmark-not-now"
					@click="onNotNow"
				/>
				<N8nButton
					size="small"
					:label="i18n.baseText('selfHealing.coachmark.tryNow')"
					data-test-id="self-healing-coachmark-try-now"
					@click="onTryNow"
				/>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
// Same dark surface as tooltips: this is a hint, not a dialog.
.coachmark {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border: none;
	background-color: var(--color--background--shade-2);
	color: var(--color--text--tint-3);

	// The arrow is the popover's own svg, drawn in the light surface colour by default.
	> span > svg,
	> svg {
		fill: var(--color--background--shade-2);
		stroke: var(--color--background--shade-2);
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.title,
.body {
	color: inherit;
}

.close {
	flex-shrink: 0;
	margin-right: calc(-1 * var(--spacing--2xs));
	color: inherit;

	&:hover {
		color: inherit;
		background-color: rgba(255, 255, 255, 0.12);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
}

.notNow {
	color: inherit;

	&:hover {
		color: inherit;
		background-color: rgba(255, 255, 255, 0.12);
	}
}
</style>
