<template>
	<div :class="$style.list">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.workflows') }}
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div v-if="loading" :class="$style.container">
			<div :class="$style.wrapper">
				<TemplateCard v-for="n in 4" :key="'index-' + n" :loading="loading" />
			</div>
		</div>
		<div v-else-if="workflows.length" :class="$style.container">
			<div :class="$style.wrapper">
				<div
					v-for="(workflow, index) in workflows"
					:key="'workflow-' + index"
					:class="[$style.card, useWorkflowButton ? $style.workflowButton : '']"
					@click="navigateTo(workflow.id, 'TemplateView', $event)"
				>
					<TemplateCard
						:class="index === workflows.length - 1 && !shouldShowLoadingState ? $style.last : ''"
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
								<div :class="$style.line" v-text="'|'" />
								<n8n-text size="small" color="text-light">By {{ workflow.user.username }}</n8n-text>
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
									v-for="(node, index) in filterCoreNodes(workflow.nodes)"
									:key="index"
									:class="$style.icon"
								>
									<TemplateNodeIcon :nodeType="node" :title="node.name" :size="nodeIconSize" />
								</div>
							</div>
						</template>
					</TemplateCard>
				</div>
				<div v-if="infinityScroll" v-infocus />
				<div v-if="infinityScroll && shouldShowLoadingState && !searchFinished">
					<TemplateCard v-for="n in 4" :key="'index-' + n" :loading="true" />
				</div>
			</div>
			<div v-if="infinityScroll && !shouldShowLoadingState" :class="$style.text">
				<n8n-text size="medium" color="text-base">
					{{ $locale.baseText('templates.endResult') }}
				</n8n-text>
			</div>
		</div>
		<div v-else>
			<n8n-text color="text-base">{{ $locale.baseText('templates.workflowsNotFound') }}</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import TemplateNodeIcon from '@/components/TemplateNodeIcon.vue';
import TemplateCard from '@/components/TemplateCard.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplateCategories } from '@/Interface';
import mixins from 'vue-typed-mixins';

interface INode {
	displayName: string;
	defaults: {
		color: string;
	};
	categories: ITemplateCategories[];
	icon: string;
	iconData?: {
		fileBuffer?: string;
		type?: string;
	};
	name: string;
	typeVersion: number;
}

export default mixins(genericHelpers).extend({
	name: 'TemplateList',
	props: {
		abbreviateNumber: {
			type: Function,
		},
		categories: {
			type: Array,
		},
		infinityScroll: {
			type: Boolean,
			default: false,
		},
		loading: {
			type: Boolean,
		},
		navigateTo: {
			type: Function,
		},
		nodeIconSize: {
			type: Number,
			default: 24,
		},
		search: {
			type: String,
		},
		totalWorkflows: {
			type: Number,
		},
		useWorkflowButton: {
			type: Boolean,
			default: false,
		},
		workflows: {
			type: Array,
		},
	},
	watch: {
		categories(categoriesAreChanged) {
			if (categoriesAreChanged) {
				this.page = 0;
				this.skip = 1;
			}
		},
		search(search) {
			if (search) {
				this.page = 0;
				this.skip = 1;
			}
		},
	},
	directives: {
		infocus: {
			inserted: (el, binding, vnode) => {
				const f = () => {
					if (vnode.context) {
						if (vnode.context.$props.infinityScroll && vnode.context.$route.name === 'TemplatesView') {
							const rect = el.getBoundingClientRect();
							if (el) {
								const inView =
									rect.top >= 0 &&
									rect.left >= 0 &&
									rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
									rect.right <= (window.innerWidth || document.documentElement.clientWidth);

								if (inView && vnode.context.$data.searchFinished) {
									// @ts-ignore
									if (vnode.context.shouldShowLoadingState) {
										vnode.context.$data.page = vnode.context.$data.page + 1;
										vnode.context.$data.skip = 10 * vnode.context.$data.page;

										vnode.context.$store.dispatch('templates/getSearchResults', {
											search: vnode.context.$props.search,
											category: vnode.context.$props.categories,
											skip: vnode.context.$data.skip,
										});

										vnode.context.$data.searchFinished = false;

										setTimeout(() => {
											if (vnode.context) vnode.context.$data.searchFinished = true;
										}, 1000);
									}
								}
							}
						} else {
							window.removeEventListener('scroll', f);
						}
					}
				};
				window.addEventListener('scroll', f);
				f();
			},
		},
	},
	components: {
		TemplateNodeIcon,
		TemplateCard,
	},
	computed: {
		shouldShowLoadingState(): boolean | undefined {
			return this.totalWorkflows > this.workflows.length;
		},
	},
	data() {
		return {
			page: 0,
			searchFinished: true,
			skip: 1,
		};
	},
	methods: {
		filterCoreNodes(nodes: []) {
			return nodes.filter((elem) => {
				const node = elem as INode;
				if (node.categories) {
					return node.categories.some((category: ITemplateCategories) => {
						return category.name !== 'Core Nodes';
					});
				} else {
					return node;
				}
			});
		},
	},
});
</script>

<style lang="scss" module>
.header {
	padding-bottom: var(--spacing-2xs);
}

.l {
}

.list {
	padding-top: var(--spacing-l);
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

.content {
	display: flex;
	align-items: center;
}

.line {
	padding: 0 6px;
	color: var(--color-foreground-base);
	font-size: var(--font-size-2xs);
}

.text {
	margin-top: var(--spacing-xl);
}
</style>
