<template>
	<div
		:class="[$style.card, lastItem && $style.last, firstItem && $style.first, !loading && $style.loaded]"
		@click="onCardClick"
	>
		<div :class="$style.loading" v-if="loading">
			<n8n-loading :rows="2" :shrinkLast="false" :loading="loading" />
		</div>
		<div v-else>
			<n8n-heading :bold="true" size="small">{{ workflow.name }}</n8n-heading>
			<div :class="$style.content">
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
				<n8n-text v-if="workflow.user" size="small" color="text-light">By {{ workflow.user.username }}</n8n-text>
			</div>
		</div>
		<div :class="[$style.nodesContainer, useWorkflowButton && $style.hideOnHover]" v-if="!loading">
			<NodeList v-if="workflow.nodes" :nodes="workflow.nodes" :limit="nodesToBeShown" size="md" />
		</div>
		<div :class="$style.buttonContainer" v-if="useWorkflowButton">
			<n8n-button
				v-if="useWorkflowButton"
				outline
				label="Use workflow"
				@click.stop="onUseWorkflowClick"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';
import { filterTemplateNodes, abbreviateNumber } from './helpers';
import NodeList from './NodeList.vue';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
	props: {
		lastItem: {
			type: Boolean,
			default: false,
		},
		firstItem: {
			type: Boolean,
			default: false,
		},
		workflow: {
			type: Object,
		},
		useWorkflowButton: {
			type: Boolean,
		},
		loading: {
			type: Boolean,
		},
	},
	components: {
		NodeList,
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
