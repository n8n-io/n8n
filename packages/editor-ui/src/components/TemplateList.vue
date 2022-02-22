<template>
	<div :class="$style.list" v-if="loading || workflows.length">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.workflows') }}
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div :class="$style.container">
			<div :class="$style.wrapper">
				<div
					v-for="(workflow, index) in workflows"
					:key="'workflow-' + index"
					:class="[$style.card, useWorkflowButton ? $style.workflowButton : '']"
					@click="navigateTo(workflow.id, 'TemplatesWorkflowView', $event)"
				>
					<LongCard
						v-if="workflow.name"
						:class="index === workflows.length - 1 && !loading ? $style.last : ''"
						:loading="false"
						:title="workflow.name"
					>
						<template v-slot:content>
							<div :class="$style.content">
								<span v-if="workflow.totalViews">
									<n8n-text size="small" color="text-light">
										<font-awesome-icon icon="eye" />
										{{ abbreviateNumber(workflow.totalViews) }}
									</n8n-text>
								</span>
								<div v-if="workflow.totalViews" :class="$style.line" v-text="'|'" />
								<n8n-text size="small" color="text-light">
									<TimeAgo :date="workflow.created_at" />
								</n8n-text>
								<div v-if="workflow.user" :class="$style.line" v-text="'|'" />
								<n8n-text v-if="workflow.user" size="small" color="text-light">
									By {{ workflow.user.username }}
								</n8n-text>
							</div>
						</template>
						<template v-slot:button>
							<div :class="$style.button">
								<n8n-button
									v-if="useWorkflowButton"
									type="outline"
									label="Use workflow"
									@click.stop="navigateTo(workflow.id, 'WorkflowTemplate', $event)"
								/>
							</div>
							<div :class="$style.nodes">
								<div
									v-for="(node, index) in filterCoreNodes(workflow.nodes).slice(
										0,
										countNodesToBeSliced(filterCoreNodes(workflow.nodes)),
									)"
									:key="index"
									:class="$style.icon"
								>
									<HoverableNodeIcon
										:nodeType="node"
										:size="useWorkflowButton ? 18 : 24"
										:title="node.name"
									/>
								</div>
								<div
									v-if="filterCoreNodes(workflow.nodes).length > nodesToBeShown + 1"
									:class="$style.nodeButton"
								>
									+{{
										filterCoreNodes(workflow.nodes).length -
										countNodesToBeSliced(filterCoreNodes(workflow.nodes))
									}}
								</div>
							</div>
						</template>
					</LongCard>
				</div>
				<div v-if="infiniteScrollEnabled" ref="loader" />
				<div v-if="loading">
					<LongCard v-for="n in 4" :key="'index-' + n" :loading="true" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import HoverableNodeIcon from '@/components/HoverableNodeIcon.vue';
import LongCard from '@/components/LongCard.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplatesNode } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { filterTemplateNodes, abbreviateNumber } from './helpers';

export default mixins(genericHelpers).extend({
	name: 'TemplateList',
	props: {
		infiniteScrollEnabled: {
			type: Boolean,
			default: false,
		},
		loading: {
			type: Boolean,
		},
		useWorkflowButton: {
			type: Boolean,
			default: false,
		},
		workflows: {
			type: Array,
		},
		totalWorkflows: {
			type: Number,
		},
		navigateTo: {
			type: Function,
		},
	},
	mounted() {
		if (this.infiniteScrollEnabled) {
			window.addEventListener('scroll', this.onScroll);
		}
	},
	destroyed() {
		window.removeEventListener('scroll', this.onScroll);
	},
	components: {
		HoverableNodeIcon,
		LongCard,
	},
	data() {
		return {
			nodesToBeShown: 5,
		};
	},
	methods: {
		abbreviateNumber,
		onScroll() {
			const el = this.$refs.loader;
			if (!el || this.loading) {
				return;
			}

			const rect = (el as Element).getBoundingClientRect();
			const inView =
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
				rect.right <= (window.innerWidth || document.documentElement.clientWidth);

			if (inView) {
				this.$emit('loadMore');
			}
		},
		countNodesToBeSliced(nodes: []): number {
			if (nodes.length > this.nodesToBeShown) {
				return this.nodesToBeShown - 1;
			} else {
				return this.nodesToBeShown;
			}
		},
		filterCoreNodes(nodes: ITemplatesNode[]) {
			return filterTemplateNodes(nodes);
		},
	},
});
</script>

<style lang="scss" module>
.header {
	padding-bottom: var(--spacing-2xs);
}

.wrapper {
	height: auto;
	background-color: var(--color-white);
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	overflow: auto;

	.loading {
		&:last-child {
			border-bottom: none !important;
		}
	}
}

.nodes {
	display: flex;
	justify-content: center;
	align-content: center;
	flex-direction: row;
}

.icon {
	margin-left: var(--spacing-xs);
}

.workflowButton {
	&:hover {
		.button {
			display: block;
		}

		.nodes {
			display: none;
		}
	}
}

.last {
	div {
		border: none;
	}
}

.button {
	display: none;
	position: relative;
	z-index: 100;
}

.nodeButton {
	width: 24px;
	min-width: 24px;
	height: 24px;
	margin-left: var(--spacing-xs);
	top: 0px;
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--color-background-light);
	border: 1px var(--color-foreground-base) solid;
	border-radius: var(--border-radius-base);
	font-size: 10px;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
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
</style>
