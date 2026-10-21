<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { APP_NAME_KEYS, getExampleApps } from '../catalogDetails';
import type { WorkflowPreviewExample } from '../types';
import WorkflowPreviewAppIcon from './WorkflowPreviewAppIcon.vue';

const props = defineProps<{
	example: WorkflowPreviewExample;
}>();

const emit = defineEmits<{
	use: [];
}>();

const i18n = useI18n();

const apps = computed(() => getExampleApps(props.example));
</script>

<template>
	<section :class="$style.details" data-test-id="workflow-preview-catalog-details">
		<div :key="example.id" :class="$style.content" :data-example-id="example.id">
			<h3 :class="$style.title" data-test-id="workflow-preview-catalog-details-title">
				{{ i18n.baseText(example.titleKey) }}
			</h3>

			<div :class="$style.columns">
				<div :class="$style.column">
					<h4 :class="$style.heading">
						{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.details.apps') }}
					</h4>
					<ul :class="$style.apps" data-test-id="workflow-preview-catalog-details-apps">
						<li v-for="app in apps" :key="app" :class="$style.app">
							<WorkflowPreviewAppIcon :icon="app" size="medium" :class="$style.appIcon" />
							<span :class="$style.appName">{{ i18n.baseText(APP_NAME_KEYS[app]) }}</span>
						</li>
					</ul>
				</div>

				<div :class="[$style.column, $style.promptColumn]">
					<h4 :class="$style.heading">
						{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.details.prompt') }}
					</h4>
					<blockquote :class="$style.prompt" data-test-id="workflow-preview-catalog-details-prompt">
						{{ i18n.baseText(example.promptKey) }}
					</blockquote>
					<N8nButton
						variant="solid"
						:class="$style.use"
						data-test-id="workflow-preview-catalog-details-use"
						@click="emit('use')"
					>
						{{
							i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.details.useExample')
						}}
					</N8nButton>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.details {
	// Fixed so the dialog height does not change between examples.
	height: 15rem;
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;

	@include motion.blur-swap-in;
}

.title {
	margin: 0;
	color: var(--color--text);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
}

.columns {
	display: grid;
	flex: 1;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
	gap: var(--spacing--lg);
	min-height: 0;
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	min-height: 0;
}

.column + .column {
	padding-left: var(--spacing--lg);
	border-left: var(--border);
}

.heading {
	margin: 0;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.apps {
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
}

// One chip per app: the icon tile and its name read as a single unit, and the
// chips wrap into short rows instead of a sparse grid.
.app {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	max-width: 100%;
	padding: var(--spacing--5xs) var(--spacing--xs) var(--spacing--5xs) var(--spacing--5xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--color--background--light-3);
}

.app .appIcon {
	border: none;
	background-color: transparent;
}

.appName {
	overflow: hidden;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.prompt {
	flex: 1;
	min-height: 0;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	line-height: 1.5;
}

.use {
	align-self: flex-end;
}

@container (max-width: 52rem) {
	.details {
		height: auto;
	}

	.columns {
		grid-template-columns: 1fr;
	}

	.column + .column {
		padding-top: var(--spacing--sm);
		padding-left: 0;
		border-top: var(--border);
		border-left: none;
	}
}
</style>
