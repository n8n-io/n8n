<script setup lang="ts">
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { INSTANCE_AI_SOURCE_QUERY, INSTANCE_AI_VIEW } from '../constants';
import InstanceAiNudgeVisualization from './InstanceAiNudgeVisualization.vue';
import { useInstanceAiNudgeStore, type InstanceAiNudgeTrigger } from './instanceAiNudge.store';

const DESCRIPTION_KEYS: Record<InstanceAiNudgeTrigger, BaseTextKey> = {
	workflow_created: 'instanceAi.nudge.description.workflowCreated',
};

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const nudgeStore = useInstanceAiNudgeStore();

const description = computed(() =>
	nudgeStore.activeTrigger ? i18n.baseText(DESCRIPTION_KEYS[nudgeStore.activeTrigger]) : '',
);

function onDismiss() {
	telemetry.track('Instance AI nudge dismissed', { trigger: nudgeStore.activeTrigger });
	nudgeStore.dismissNudge();
}

async function onTryAssistant() {
	telemetry.track('Instance AI nudge clicked', { trigger: nudgeStore.activeTrigger });
	nudgeStore.dismissNudge();
	await router.push({
		name: INSTANCE_AI_VIEW,
		query: { [INSTANCE_AI_SOURCE_QUERY]: 'nudge' },
	});
}
</script>

<template>
	<aside
		v-if="nudgeStore.activeTrigger"
		:class="$style.nudge"
		role="complementary"
		data-test-id="instance-ai-nudge"
	>
		<button
			type="button"
			:class="$style.dismiss"
			:aria-label="i18n.baseText('instanceAi.nudge.dismiss')"
			data-test-id="instance-ai-nudge-dismiss"
			@click="onDismiss"
		>
			<N8nIcon icon="x" size="small" />
		</button>

		<div :class="$style.main">
			<N8nIcon icon="sparkles" :size="24" color="text-dark" :class="$style.icon" />

			<div :class="$style.text">
				<N8nText size="large" bold color="text-dark">
					{{ i18n.baseText('instanceAi.nudge.title') }}
				</N8nText>

				<N8nText size="medium" color="text-base" :class="$style.description">
					{{ description }}
				</N8nText>
			</div>

			<N8nButton
				variant="subtle"
				size="medium"
				type="button"
				:class="$style.cta"
				data-test-id="instance-ai-nudge-cta"
				@click="onTryAssistant"
			>
				{{ i18n.baseText('instanceAi.nudge.cta') }}
				<N8nIcon icon="arrow-right" size="small" />
			</N8nButton>
		</div>

		<div :class="$style.visual" aria-hidden="true" data-test-id="instance-ai-nudge-visualization">
			<InstanceAiNudgeVisualization />
		</div>
	</aside>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.nudge {
	position: fixed;
	// Horizontal centering without transform, which is reserved for the
	// entrance animation below.
	left: 0;
	right: 0;
	margin-inline: auto;
	width: fit-content;
	// Clears the canvas execution buttons that occupy the very bottom center.
	bottom: var(--spacing--2xl);
	z-index: var(--instance-ai-nudge--z);
	display: flex;
	align-items: stretch;
	max-width: 640px;
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--xs);
	box-shadow: var(--shadow--md);
	// Clip the visualization panel so it shares the card's border radius.
	overflow: hidden;
	text-align: left;

	--animation--fade-in-up--translate: var(--spacing--md);
	--animation--fade-in-up--duration: var(--duration--base);
	@include motion.fade-in-up;
}

.main {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	max-width: 340px;
	padding: var(--spacing--md) var(--spacing--lg);
}

.visual {
	flex-shrink: 0;
	width: 300px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--background--subtle);
	// Same dotted-canvas treatment as WorkflowPreviewCanvas, at mini scale.
	background-image: radial-gradient(
		oklch(from var(--canvas--dot--color) l c h / 0.5) 1px,
		transparent 1px
	);
	background-size: 12px 12px;
	border-left: var(--border);
}

.icon {
	align-self: flex-start;
}

.cta {
	align-self: stretch;
	width: 100%;
	--button--height: auto;
	--button--padding: var(--spacing--2xs) var(--spacing--sm);
}

.dismiss {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	background: transparent;
	border: none;
	border-radius: var(--radius--2xs);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
	}
}

.text {
	display: flex;
	flex-direction: column;
	// Tighter than the card's own gap so title and description read as one block.
	gap: var(--spacing--3xs);
}

.description {
	display: block;
	line-height: 1.4;
	margin-bottom: var(--spacing--3xs);
}
</style>
