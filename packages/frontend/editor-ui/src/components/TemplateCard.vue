<script lang="ts" setup>
import { abbreviateNumber } from '@/utils/typesUtils';
import NodeList from './NodeList.vue';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

const i18n = useI18n();

const nodesToBeShown = 5;

withDefaults(
	defineProps<{
		workflow?: ITemplatesWorkflow;
		lastItem?: boolean;
		firstItem?: boolean;
		useWorkflowButton?: boolean;
		loading?: boolean;
		simpleView?: boolean;
	}>(),
	{
		lastItem: false,
		firstItem: false,
		useWorkflowButton: false,
		loading: false,
		simpleView: false,
	},
);

const emit = defineEmits<{
	useWorkflow: [e: MouseEvent];
	click: [e: MouseEvent];
}>();

function onUseWorkflowClick(e: MouseEvent) {
	emit('useWorkflow', e);
}

function onCardClick(e: MouseEvent) {
	emit('click', e);
}
</script>

<template>
	<div
		:class="[
			$style.card,
			lastItem && $style.last,
			firstItem && $style.first,
			!loading && $style.loaded,
		]"
		data-test-id="template-card"
		@click="onCardClick"
	>
		<div v-if="loading" :class="$style.loading">
			<n8n-loading :rows="2" :shrink-last="false" :loading="loading" />
		</div>
		<div v-else-if="workflow">
			<n8n-heading :bold="true" size="small">{{ workflow.name }}</n8n-heading>
			<div v-if="!simpleView" :class="$style.content">
				<span v-if="workflow.totalViews">
					<n8n-text size="small" color="text-light">
						<n8n-icon icon="eye" size="xsmall" />
						{{ abbreviateNumber(workflow.totalViews) }}
					</n8n-text>
				</span>
				<div v-if="workflow.totalViews" :class="$style.line" v-text="'|'" />
				<n8n-text size="small" color="text-light">
					<TimeAgo :date="workflow.createdAt" />
				</n8n-text>
				<div v-if="workflow.user" :class="$style.line" v-text="'|'" />
				<n8n-text v-if="workflow.user" size="small" color="text-light">
					{{
						i18n.baseText('template.byAuthor' as BaseTextKey, {
							interpolate: { name: workflow.user.username },
						})
					}}</n8n-text
				>
			</div>
		</div>
		<div
			v-if="!loading && workflow"
			:class="[$style.nodesContainer, useWorkflowButton && $style.hideOnHover]"
		>
			<NodeList v-if="workflow.nodes" :nodes="workflow.nodes" :limit="nodesToBeShown" size="md" />
		</div>
		<div v-if="useWorkflowButton" :class="$style.buttonContainer">
			<n8n-button
				v-if="useWorkflowButton"
				outline
				label="Use workflow"
				data-test-id="use-workflow-button"
				@click.stop="onUseWorkflowClick"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.nodes {
	display: flex;
	justify-content: center;
	align-content: center;
	flex-direction: row;
}

.icon {
	margin-left: var(--spacing-xs);
}

.card {
	position: relative;
	border-left: var(--border-base);
	border-right: var(--border-base);
	border-bottom: var(--border-base);
	background-color: var(--color-background-xlight);

	display: flex;
	align-items: center;
	padding: 0 var(--spacing-s) var(--spacing-s) var(--spacing-s);
	background-color: var(--color-background-xlight);
	cursor: pointer;

	&:hover {
		.hideOnHover {
			visibility: hidden;
		}

		.buttonContainer {
			display: block;
		}
	}
}

.buttonContainer {
	display: none;
	position: absolute;
	right: 10px;
	top: 30%;
}

.loaded {
	padding-top: var(--spacing-s);
}

.first {
	border-top: var(--border-base);
	border-top-right-radius: var(--border-radius-large);
	border-top-left-radius: var(--border-radius-large);
}

.last {
	border-bottom-right-radius: var(--border-radius-large);
	border-bottom-left-radius: var(--border-radius-large);
}

.content {
	display: flex;
	align-items: center;
}

.line {
	padding: 0 6px;
	color: var(--color-foreground-base);
	font-size: var(--font-size-2xs);
}

.loading {
	width: 100%;
	background-color: var(--color-background-xlight);
}

.nodesContainer {
	min-width: 175px;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-grow: 1;
}
</style>
