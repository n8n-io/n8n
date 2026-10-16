<script setup lang="ts">
import type { AutomationMapAnnotations, AutomationMapGraph } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nIconButton, N8nMarkdown, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

const props = defineProps<{
	graph: AutomationMapGraph;
	annotations: AutomationMapAnnotations | null;
	activeStep: number | null;
}>();

const emit = defineEmits<{
	'update:activeStep': [step: number | null];
	selectWorkflow: [workflowId: string];
}>();

const i18n = useI18n();
const collapsed = ref(false);

const workflowNames = computed(
	() => new Map(props.graph.workflows.map((workflow) => [workflow.id, workflow.name])),
);

const entryPoints = computed(() =>
	props.graph.workflows.filter((workflow) =>
		workflow.triggers.some((trigger) =>
			['schedule', 'webhook', 'form', 'chat', 'app', 'mcp'].includes(trigger.kind),
		),
	),
);

function toggleStep(index: number) {
	emit('update:activeStep', props.activeStep === index ? null : index);
}

const legend = computed(() => [
	{ className: 'calls', label: i18n.baseText('automationMaps.legend.calls') },
	{ className: 'dispatches', label: i18n.baseText('automationMaps.legend.dispatches') },
	{ className: 'references', label: i18n.baseText('automationMaps.legend.references') },
	{ className: 'errorHandler', label: i18n.baseText('automationMaps.legend.errorHandler') },
	{ className: 'data', label: i18n.baseText('automationMaps.legend.data') },
]);
</script>

<template>
	<aside
		:class="[$style.panel, { [$style.collapsed]: collapsed }]"
		data-test-id="automation-map-story"
	>
		<header :class="$style.header">
			<N8nIcon icon="book-open" :size="16" />
			<N8nText bold>{{ i18n.baseText('automationMaps.story.title') }}</N8nText>
			<span
				v-if="annotations?.source === 'ai'"
				:class="$style.aiBadge"
				:title="i18n.baseText('automationMaps.story.aiHint')"
			>
				<N8nIcon icon="sparkles" :size="10" /> AI
			</span>
			<N8nIconButton
				:icon="collapsed ? 'panel-left' : 'panel-left-close'"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('automationMaps.story.toggle')"
				:class="$style.toggle"
				@click="collapsed = !collapsed"
			/>
		</header>
		<div v-if="!collapsed" :class="$style.body">
			<N8nCallout v-if="annotations?.aiError" theme="warning" :class="$style.callout">
				{{ i18n.baseText('automationMaps.story.aiUnavailable') }}
			</N8nCallout>
			<N8nMarkdown
				v-if="annotations?.summary"
				:content="annotations.summary"
				:class="$style.summary"
			/>

			<div v-if="annotations?.steps.length" :class="$style.section">
				<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('automationMaps.story.steps') }}
				</N8nText>
				<ol :class="$style.steps">
					<li
						v-for="(step, index) in annotations.steps"
						:key="step.title"
						:class="[$style.step, { [$style.activeStep]: activeStep === index }]"
						data-test-id="automation-map-step"
						@click="toggleStep(index)"
					>
						<span :class="$style.stepNumber">{{ index + 1 }}</span>
						<div :class="$style.stepText">
							<N8nText bold size="small">{{ step.title }}</N8nText>
							<N8nText size="small" color="text-base">{{ step.description }}</N8nText>
							<div v-if="activeStep === index" :class="$style.chips">
								<button
									v-for="workflowId in step.workflowIds"
									:key="workflowId"
									type="button"
									:class="$style.chip"
									@click.stop="emit('selectWorkflow', workflowId)"
								>
									{{ workflowNames.get(workflowId) }}
								</button>
							</div>
						</div>
					</li>
				</ol>
			</div>

			<div v-else-if="entryPoints.length" :class="$style.section">
				<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('automationMaps.story.entryPoints') }}
				</N8nText>
				<div :class="$style.chips">
					<button
						v-for="workflow in entryPoints"
						:key="workflow.id"
						type="button"
						:class="$style.chip"
						@click="emit('selectWorkflow', workflow.id)"
					>
						<N8nIcon icon="zap" :size="10" /> {{ workflow.name }}
					</button>
				</div>
			</div>

			<div :class="$style.section">
				<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('automationMaps.legend.title') }}
				</N8nText>
				<div v-for="item in legend" :key="item.className" :class="$style.legendItem">
					<svg width="36" height="8" :class="$style.legendLine">
						<line x1="0" y1="4" x2="36" y2="4" :class="$style[item.className]" />
					</svg>
					<N8nText size="xsmall">{{ item.label }}</N8nText>
				</div>
				<div :class="$style.legendItem">
					<span :class="$style.legendTrigger" />
					<N8nText size="xsmall">{{ i18n.baseText('automationMaps.legend.entryPoint') }}</N8nText>
				</div>
			</div>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	width: 340px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3);
	border-right: var(--border);
	overflow: hidden;
}

.collapsed {
	width: 48px;

	.header {
		flex-direction: column;
		padding: var(--spacing--xs) 0;
	}

	.header > :not(.toggle) {
		display: none;
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.aiBadge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
	background: var(--color--primary--tint-3);
	border-radius: var(--radius--xl);
	padding: 0 var(--spacing--3xs);
}

.toggle {
	margin-left: auto;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.callout {
	font-size: var(--font-size--2xs);
}

.summary {
	--n8n-markdown--base-font-size: var(--font-size--xs);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.sectionTitle {
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.steps {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.step {
	display: flex;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	border: 1px solid transparent;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.activeStep {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);

	&:hover {
		background: var(--color--primary--tint-3);
	}
}

.stepNumber {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--color--primary);
	color: var(--color--text--inverse, white);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	display: flex;
	align-items: center;
	justify-content: center;
}

.stepText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background);
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	cursor: pointer;
	color: var(--color--text);

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
	}
}

.legendItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.legendLine line {
	stroke: light-dark(oklch(0.72 0 0), oklch(0.5 0 0));
	stroke-width: 2;
}

.legendLine .dispatches {
	stroke-dasharray: 8 6;
}

.legendLine .references {
	stroke-dasharray: 2 6;
	stroke-linecap: round;
}

.legendLine .errorHandler {
	stroke: var(--color--danger);
	stroke-dasharray: 8 6;
}

.legendLine .data {
	stroke: var(--color--primary--tint-1);
}

.legendTrigger {
	width: 36px;
	height: 14px;
	border: 2px solid var(--color--foreground--shade-1);
	border-radius: 10px 3px 3px 10px;
}
</style>
