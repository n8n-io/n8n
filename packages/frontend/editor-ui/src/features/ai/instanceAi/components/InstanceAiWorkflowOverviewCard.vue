<script lang="ts" setup>
import type { WorkflowOverview } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	overview: WorkflowOverview;
}>();

const i18n = useI18n();

interface OverviewPane {
	key: 'triggers' | 'steps' | 'results';
	icon: IconName;
	label: string;
	text: string;
}

const panes = computed<OverviewPane[]>(() => [
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
]);
</script>

<template>
	<section :class="$style.card" data-test-id="instance-ai-workflow-overview">
		<div :class="$style.header">
			<N8nHeading tag="h3" size="small" :class="$style.title">
				{{ i18n.baseText('instanceAi.workflowOverview.title') }}
			</N8nHeading>
			<span
				v-if="overview.provisional"
				:class="$style.provisional"
				data-test-id="instance-ai-workflow-overview-provisional"
			>
				{{ i18n.baseText('instanceAi.workflowOverview.provisional') }}
			</span>
		</div>
		<div :class="$style.panes">
			<div
				v-for="pane in panes"
				:key="pane.key"
				:class="$style.pane"
				:data-test-id="`instance-ai-workflow-overview-${pane.key}`"
			>
				<span :class="$style.paneIconWrap">
					<N8nIcon :icon="pane.icon" size="medium" :class="$style.paneIcon" />
				</span>
				<span :class="$style.paneText">
					<span :class="$style.paneLabel">{{ pane.label }}</span>
					<span v-if="pane.text" :class="$style.paneValue">{{ pane.text }}</span>
					<span v-else :class="$style.paneEmpty">
						{{ i18n.baseText('instanceAi.workflowOverview.empty') }}
					</span>
				</span>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.card {
	position: sticky;
	top: 0;
	z-index: 1;
	flex-shrink: 0;
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
	padding: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.header {
	margin-bottom: var(--spacing--xs);
	padding: 0 var(--spacing--2xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.title {
	color: var(--text-color--subtle);
}

.provisional {
	font-size: var(--font-size--2xs);
	font-style: italic;
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.panes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.pane {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.paneIconWrap {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.paneIcon {
	color: var(--text-color--subtle);
}

.paneText {
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: var(--spacing--3xs);
}

.paneLabel {
	font-size: var(--font-size--xs);
	text-transform: uppercase;
}

.paneValue {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	overflow-wrap: anywhere;
}

.paneEmpty {
	font-size: var(--font-size--2xs);
	font-style: italic;
	color: var(--text-color--subtle);
}
</style>
