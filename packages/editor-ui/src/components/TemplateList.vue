<template>
	<div :class="$style.list">
		<div :class="$style.header">
			<n8n-heading v-if="!loading" :bold="true" size="medium" color="text-light"
				>Workflows ({{ workflowsUI.length }})</n8n-heading
			>
			<n8n-loading :animated="true" :loading="loading" :rows="1" variant="h1" />
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
				<div v-for="workflow in workflowsUI" :key="workflow.id">
					<TemplateCard :title="workflow.name" :loading="false">
						<template v-slot:right>
							<div>
								<NodeList :nodes="workflow.nodes" :showMore="true" />
							</div>
						</template>

						<template v-slot:rightHover>
							<n8n-button type="outline" label="Use workflow" />
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
			</div>
		</div>

		<div v-else class="emptyText">
			<n8n-text>No workflows found. Try adjusting your search to see more.</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import NodeList from '@/components/NodeList.vue';
import TemplateCard from '@/components/TemplateCard.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateList',
	props: {
		loading: {
			type: Boolean,
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
			return this.$store.getters['templates/getWorkflows'];
		},
	},
	data() {
		return {
			workflowsUI: [],
			hover: false,
		};
	},
	methods: {
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
