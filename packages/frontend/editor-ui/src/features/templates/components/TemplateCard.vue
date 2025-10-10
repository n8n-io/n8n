<script lang="ts" setup>
import { abbreviateNumber } from '@/utils/typesUtils';
import NodeList from '@/components/NodeList.vue';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import { N8nButton, N8nHeading, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
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
			<N8nLoading :rows="2" :shrink-last="false" :loading="loading" />
		</div>
		<div v-else-if="workflow">
			<N8nHeading :bold="true" size="small">{{ workflow.name }}</N8nHeading>
			<div v-if="!simpleView" :class="$style.content">
				<span v-if="workflow.totalViews">
					<N8nText size="small" color="text-light">
						<N8nIcon icon="eye" size="xsmall" />
						{{ abbreviateNumber(workflow.totalViews) }}
					</N8nText>
				</span>
				<div v-if="workflow.totalViews" :class="$style.line" v-text="'|'" />
				<N8nText size="small" color="text-light">
					<TimeAgo :date="workflow.createdAt" />
				</N8nText>
				<div v-if="workflow.user" :class="$style.line" v-text="'|'" />
				<N8nText v-if="workflow.user" size="small" color="text-light">
					{{
						i18n.baseText('template.byAuthor' as BaseTextKey, {
							interpolate: { name: workflow.user.username },
						})
					}}</N8nText
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
			<N8nButton
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
	margin-left: var(--spacing--xs);
}

.card {
	position: relative;
	border-left: var(--border);
	border-right: var(--border);
	border-bottom: var(--border);
	background-color: var(--color--background--light-3);

	display: flex;
	align-items: center;
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);
	background-color: var(--color--background--light-3);
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
	padding-top: var(--spacing--sm);
}

.first {
	border-top: var(--border);
	border-top-right-radius: var(--radius--lg);
	border-top-left-radius: var(--radius--lg);
}

.last {
	border-bottom-right-radius: var(--radius--lg);
	border-bottom-left-radius: var(--radius--lg);
}

.content {
	display: flex;
	align-items: center;
}

.line {
	padding: 0 6px;
	color: var(--color--foreground);
	font-size: var(--font-size--2xs);
}

.loading {
	width: 100%;
	background-color: var(--color--background--light-3);
}

.nodesContainer {
	min-width: 175px;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-grow: 1;
}
</style>
