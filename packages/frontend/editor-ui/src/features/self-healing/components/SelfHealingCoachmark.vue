<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { SELF_HEALING_SETTINGS_HASH } from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Nudge anchored to a failed execution in the executions list. The slot is
 * the anchor and renders unchanged when the coachmark is not showing.
 * "Try now" opens the project's self-healing settings. In this prototype a
 * dismissal lasts for the current visit only; the list resets it on mount so
 * the nudge appears on every visit with a failure.
 */
const props = defineProps<{
	execution: ExecutionSummary;
	/** True for the one row the list picked as the anchor. */
	active: boolean;
}>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();

const workflow = computed(() => workflowsListStore.getWorkflowById(props.execution.workflowId));

const projectId = computed(() => {
	const fromRoute = route.params.projectId;
	if (typeof fromRoute === 'string' && fromRoute) return fromRoute;
	return workflow.value?.homeProject?.id ?? null;
});

// Without a project there are no settings to open, so stay quiet on the overview.
const isOpen = computed(
	() => props.active && projectId.value !== null && store.shouldShowCoachmark(props.execution),
);

const body = computed(() => {
	const status = store.getWorkflowStatus(props.execution.workflowId, projectId.value);
	const autonomy = status.enrolled ? status.config.autonomy : 'review';
	return i18n.baseText('selfHealing.coachmark.body', {
		interpolate: { behaviour: i18n.baseText(`selfHealing.autonomy.${autonomy}.description`) },
	});
});

async function onTryNow() {
	store.dismissCoachmark();
	if (projectId.value === null) return;
	await router.push({
		name: VIEWS.PROJECT_SETTINGS,
		params: { projectId: projectId.value },
		hash: SELF_HEALING_SETTINGS_HASH,
	});
}

function onDismiss() {
	store.dismissCoachmark();
}
</script>

<template>
	<N8nPopover
		v-if="isOpen"
		:open="true"
		side="bottom"
		align="start"
		:side-offset="8"
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
					@click="onDismiss"
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
					@click="onDismiss"
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
	<!-- eslint-disable-next-line vue/no-multiple-template-root -- rows without the coachmark keep their original markup -->
	<slot v-else />
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
