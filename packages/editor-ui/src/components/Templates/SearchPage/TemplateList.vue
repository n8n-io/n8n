<template>
	<div :class="$style.list">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				Workflows
				<span v-if="!loading" v-text="`(${workflowsUI.length})`" />
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
		<div v-else-if="workflowsUI.length" :class="$style.container">
			<div :class="$style.wrapper">
				<div v-for="(workflow, index) in workflowsUI" :key="'workflow-' + index">
					<TemplateCard :title="workflow.name" :loading="false">
						<template v-slot:right>
							<div>
								<NodeList :nodes="workflow.nodes" :showMore="true" />
							</div>
						</template>

						<template v-slot:rightHover>
							<n8n-button type="outline" label="Use workflow" @click="redirectToTemplate(workflow.id)"/>
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
				<TemplateCard :loading="true" title="" />
				<TemplateCard :loading="true" title="" />
				<TemplateCard :loading="true" title="" />
				<TemplateCard :loading="true" title="" />
				<TemplateCard v-if="!searchFinished" v-infocus :loading="true" title="" />
			</div>
		</div>

		<div v-else class="emptyText">
			<n8n-text>No workflows found. Try adjusting your search to see more.</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import NodeList from '@/components/Templates/SearchPage/NodeList.vue';
import TemplateCard from '@/components/Templates/SearchPage/TemplateCard.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateList',
	props: {
		category: {
			type: Object,
		},
		loading: {
			type: Boolean,
		},
		search: {
			type: String,
		},
	},
	directives: {
		infocus: {
			inserted: (el, binding, vnode) => {
				const f = () => {
					const rect = el.getBoundingClientRect();
					if (el) {
						const inView =
							rect.top >= 200 &&
							rect.left >= 0 &&
							rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
							rect.right <= (window.innerWidth || document.documentElement.clientWidth);

						if (inView) {
							if (vnode.context) {
								if (!vnode.context.$data.searchFinished) {
									vnode.context.$data.page = vnode.context.$data.page + 1;
									vnode.context.$data.skip = 10 * vnode.context.$data.page;

									vnode.context.$store.dispatch('templates/getSearchResults', {
										search: vnode.context.$props.search,
										category: vnode.context.$props.category,
										skip: vnode.context.$data.skip,
									});

									vnode.context.$data.searchFinished = true;

									setTimeout(() => {
										if (vnode.context) vnode.context.$data.searchFinished = false;
									}, 1000);
								}
							}
						}
					}
				};
				window.addEventListener('scroll', f);
				f();
			},
		},
	},
	components: {
		NodeList,
		TemplateCard,
	},
	watch: {
		workflows(newWorkflows) {
			this.workflowsUI = newWorkflows;
		},
	},
	computed: {
		workflows() {
			return this.$store.getters['templates/getTemplates'];
		},
	},
	data() {
		return {
			hover: false,
			page: 0,
			searchFinished: false,
			skip: 1,
			workflowsUI: [],
		};
	},
	methods: {
		redirectToTemplate(templateId: string) {
			this.$router.push(`/workflows/templates/${templateId}`);
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
	padding-top: var(--spacing-m);
}

.wrapper {
	height: auto;
	background-color: var(--color-white);
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	overflow: auto;
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
</style>
