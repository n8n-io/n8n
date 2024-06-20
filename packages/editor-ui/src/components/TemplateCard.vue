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
						<font-awesome-icon icon="eye" />
						{{ abbreviateNumber(workflow.totalViews) }}
					</n8n-text>
				</span>
				<div v-if="workflow.totalViews" :class="$style.line" v-text="'|'" />
				<n8n-text size="small" color="text-light">
					<TimeAgo :date="workflow.createdAt" />
				</n8n-text>
				<div v-if="workflow.user" :class="$style.line" v-text="'|'" />
				<n8n-text v-if="workflow.user" size="small" color="text-light"
					>By {{ workflow.user.username }}</n8n-text
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

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { filterTemplateNodes } from '@/utils/nodeTypesUtils';
import { abbreviateNumber } from '@/utils/typesUtils';
import NodeList from './NodeList.vue';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ITemplatesWorkflow } from '@/Interface';

export default defineComponent({
	name: 'TemplateCard',
	components: {
		TimeAgo,
		NodeList,
	},
	props: {
		workflow: {
			type: Object as PropType<ITemplatesWorkflow>,
		},
		lastItem: {
			type: Boolean,
			default: false,
		},
		firstItem: {
			type: Boolean,
			default: false,
		},
		useWorkflowButton: {
			type: Boolean,
		},
		loading: {
			type: Boolean,
		},
		simpleView: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			nodesToBeShown: 5,
		};
	},
	methods: {
		filterTemplateNodes,
		abbreviateNumber,
		countNodesToBeSliced(nodes: []): number {
			if (nodes.length > this.nodesToBeShown) {
				return this.nodesToBeShown - 1;
			} else {
				return this.nodesToBeShown;
			}
		},
		onUseWorkflowClick(e: MouseEvent) {
			this.$emit('useWorkflow', e);
		},
		onCardClick(e: MouseEvent) {
			this.$emit('click', e);
		},
	},
});
</script>

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
