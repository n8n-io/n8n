<script lang="ts" setup>
import type { WorkflowOverview } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	overview: WorkflowOverview | null;
	/** Whether the on-demand generate/refresh action is available. */
	canGenerate?: boolean;
	isGenerating?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
}>();

const i18n = useI18n();

interface OverviewStep {
	key: 'triggers' | 'steps' | 'results';
	icon: IconName;
	label: string;
	text: string;
}

const steps = computed<OverviewStep[]>(() => {
	if (!props.overview) return [];
	return [
		{
			key: 'triggers',
			icon: 'zap',
			label: i18n.baseText('instanceAi.workflowOverview.triggers'),
			text: props.overview.triggers.trim(),
		},
		{
			key: 'steps',
			icon: 'list-checks',
			label: i18n.baseText('instanceAi.workflowOverview.steps'),
			text: props.overview.steps.trim(),
		},
		{
			key: 'results',
			icon: 'circle-check',
			label: i18n.baseText('instanceAi.workflowOverview.results'),
			text: props.overview.results.trim(),
		},
	];
});

const generateLabel = computed(() =>
	i18n.baseText(
		props.overview ? 'instanceAi.workflowOverview.refresh' : 'instanceAi.workflowOverview.generate',
	),
);
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-workflow-overview-preview">
		<div v-if="overview" :class="$style.content">
			<div :class="$style.flow">
				<template v-for="(step, index) in steps" :key="step.key">
					<N8nIcon
						v-if="index > 0"
						icon="arrow-right"
						size="large"
						:class="$style.arrow"
						aria-hidden="true"
					/>
					<section
						:class="$style.step"
						:data-test-id="`instance-ai-workflow-overview-preview-${step.key}`"
					>
						<div :class="$style.stepHeader">
							<N8nIcon :icon="step.icon" size="medium" :class="$style.stepIcon" />
							<N8nHeading tag="h3" size="small" :class="$style.stepLabel">
								{{ step.label }}
							</N8nHeading>
						</div>
						<N8nText v-if="step.text" size="small" :class="$style.stepText">
							{{ step.text }}
						</N8nText>
						<N8nText v-else size="small" :class="$style.stepEmpty">
							{{ i18n.baseText('instanceAi.workflowOverview.empty') }}
						</N8nText>
					</section>
				</template>
			</div>
			<N8nButton
				v-if="canGenerate"
				type="secondary"
				size="small"
				:loading="isGenerating"
				:disabled="isGenerating"
				data-test-id="instance-ai-workflow-overview-refresh"
				@click="emit('generate')"
			>
				{{ generateLabel }}
			</N8nButton>
		</div>

		<div v-else :class="$style.emptyState" data-test-id="instance-ai-workflow-overview-empty">
			<N8nText size="small" :class="$style.emptyText">
				{{
					i18n.baseText(
						isGenerating
							? 'instanceAi.workflowOverview.generating'
							: 'instanceAi.workflowOverview.emptyState',
					)
				}}
			</N8nText>
			<N8nButton
				v-if="canGenerate"
				type="primary"
				size="small"
				:loading="isGenerating"
				:disabled="isGenerating"
				data-test-id="instance-ai-workflow-overview-generate"
				@click="emit('generate')"
			>
				{{ generateLabel }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	overflow: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	background: var(--color--background--light-2);
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
}

.flow {
	display: flex;
	align-items: stretch;
	gap: var(--spacing--sm);
	max-width: 960px;
	flex-wrap: wrap;
	justify-content: center;
}

.arrow {
	color: var(--text-color--subtle);
	align-self: center;
	flex-shrink: 0;
}

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1 1 200px;
	min-width: 200px;
	max-width: 280px;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
}

.stepHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.stepIcon {
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.stepLabel {
	color: var(--text-color--subtle);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	font-size: var(--font-size--3xs);
}

.stepText {
	color: var(--color--text--shade-1);
	overflow-wrap: anywhere;
}

.stepEmpty {
	font-style: italic;
	color: var(--text-color--subtle);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	max-width: 360px;
	text-align: center;
}

.emptyText {
	color: var(--text-color--subtle);
}
</style>
