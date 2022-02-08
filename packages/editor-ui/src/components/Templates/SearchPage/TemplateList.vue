<template>
	<div :class="$style.list">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				Workflows
				<span v-if="!loading" v-text="`(${totalworkflows})`" />
			</n8n-heading>
		</div>
		<div v-if="loading" :class="$style.container">
			<div :class="$style.wrapper">
				<TemplateCard :loading="loading" title="" />
				<TemplateCard :loading="loading" title="" />
				<TemplateCard :loading="loading" title="" />
				<TemplateCard :loading="loading" title="" />
			</div>
		</div>
		<div v-else-if="workflows.length" :class="$style.container">
			<div :class="$style.wrapper">
				<div
					v-for="(workflow, index) in workflows"
					:key="'workflow-' + index"
					:class="$style.card"
					@click="navigateTo(workflow.id, 'TemplatePage', $event)"
				>
					<TemplateCard
						:title="workflow.name"
						:loading="false"
						:class="index === workflows.length - 1 && !shouldShowLoadingState ? $style.last : ''"
					>
						<template v-slot:button>
							<div :class="$style.nodes">
								<div
									v-for="(node, index) in workflow.nodes"
									:key="index"
									:class="$style.icon"
								>
									<NodeIcon
										:nodeType="node"
										:title="node.name"
										:size="24"
									/>
								</div>
							</div>
						</template>

						<template v-slot:footer>
							<div :class="$style.footer">
								<span v-if="workflow.totalViews">
									<n8n-text size="small" color="text-light">
										<font-awesome-icon icon="eye" />
										{{ truncate(workflow.totalViews) }}
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
					</TemplateCard>
				</div>
				<div v-infocus />
				<div v-if="shouldShowLoadingState && !searchFinished">
					<TemplateCard :loading="true" title="" />
					<TemplateCard :loading="true" title="" />
					<TemplateCard :loading="true" title="" />
					<TemplateCard :loading="true" title="" />
				</div>
			</div>

			<div :class="$style.text" v-if="!shouldShowLoadingState">
				<n8n-text size="medium" color="text-base">End of results</n8n-text>
			</div>
		</div>

		<div v-else>
			<n8n-text color="text-base">{{ $locale.baseText('templates.workflowsNotFound') }}</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import NodeIcon from '@/components/Templates/WorkflowPage/TemplateDetails/NodeIcon/NodeIcon.vue';
import TemplateCard from '@/components/Templates/SearchPage/TemplateCard.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateList',
	props: {
		categories: {
			type: Array,
		},
		loading: {
			type: Boolean,
		},
		search: {
			type: String,
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
						if (vnode.context.$route.name === 'TemplateSearchPage') {
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
		NodeIcon,
		TemplateCard,
	},
	computed: {
		shouldShowLoadingState(): boolean | undefined {
			if (this.workflows && this.totalworkflows) {
				return this.totalworkflows > this.workflows.length;
			}
			return;
		},
		totalworkflows() {
			return this.$store.getters['templates/getTotalWorkflows'];
		},
		workflows() {
			return this.$store.getters['templates/getTemplates'];
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
		navigateTo(templateId: string, page: string, e: PointerEvent) {
			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id: templateId } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: page, params: { id: templateId } });
			}
		},
		truncate(views: number): string {
			return new Intl.NumberFormat('en-GB', {
				notation: 'compact',
				compactDisplay: 'short',
			}).format(views);
		},
	},
});
</script>

<style lang="scss" module>
.header {
  padding-bottom: var(--spacing-2xs);
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

.card {
  cursor: pointer;
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

.footer {
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
