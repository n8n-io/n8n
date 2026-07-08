<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
<script lang="ts" setup>
import type { IInstanceAiExampleWorkflow } from '@n8n/rest-api-client/api/templates';
import TemplateNodeIconSet from './TemplateNodeIconSet.vue';
import { N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

const i18n = useI18n();
const telemetry = useTelemetry();

const props = defineProps<{
	workflow: IInstanceAiExampleWorkflow;
	selectedCategory?: string;
	selectedSubcategory?: string;
	showAllNodes?: boolean;
}>();

const emit = defineEmits<{
	hover: [prompt: string];
	hoverEnd: [];
	select: [prompt: string];
}>();

function getPrompt(): string {
	return props.workflow.prompt ?? '';
}

function handleSelect() {
	telemetry.track('AI Assistant template examples example clicked', {
		example_title: props.workflow.name,
		category: props.selectedCategory ?? 'All',
		subcategory: props.selectedSubcategory,
	});
	emit('select', getPrompt());
}
</script>

<template>
	<div
		:class="$style.card"
		role="button"
		tabindex="0"
		:aria-label="
			i18n.baseText('experiments.instanceAiTemplateExamples.card.ariaLabel' as BaseTextKey, {
				interpolate: { name: workflow.name },
			})
		"
		data-test-id="template-example-card"
		@mouseenter="emit('hover', getPrompt())"
		@mouseleave="emit('hoverEnd')"
		@focus="emit('hover', getPrompt())"
		@blur="emit('hoverEnd')"
		@click="handleSelect"
		@keydown.enter="handleSelect"
		@keydown.space.prevent="handleSelect"
	>
		<N8nText :class="$style.title" :bold="true" size="medium" tag="h3">
			{{ workflow.name }}
		</N8nText>
		<div :class="$style.footer">
			<TemplateNodeIconSet :nodes="workflow.nodes" :show-all="showAllNodes" />
		</div>
		<div :class="$style.editHint">
			<span :class="$style.editHintText">{{
				i18n.baseText('experiments.instanceAiTemplateExamples.card.editHint' as BaseTextKey)
			}}</span>
			<N8nIcon icon="pencil-alt" size="small" />
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: var(--spacing--sm);
	background: var(--color--foreground--tint-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition:
		background 0.15s ease,
		border-color 0.15s ease,
		transform 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		background: var(--color--foreground--tint-1);
		border-color: var(--color--foreground);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.55;
	min-height: 3.1em;
	margin-bottom: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	opacity: 0.5;
	filter: grayscale(1);
	transition:
		opacity 0.15s ease,
		filter 0.15s ease;

	.card:hover & {
		opacity: 1;
		filter: grayscale(0);
	}
}

.editHint {
	position: absolute;
	bottom: 11px;
	right: 11px;
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--color--text--tint-1);
	opacity: 0;
	transition: opacity 0.15s ease;

	.card:hover & {
		opacity: 0.6;
	}
}

.editHintText {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}
</style>
