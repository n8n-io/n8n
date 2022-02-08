<template>
	<div :class="$style.list">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				Workflows
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
						:class="index === workflows.length - 1 ? $style.last : ''"
					>
						<template v-slot:button>
							<div :class="$style.button">
								<n8n-button
									type="outline"
									label="Use workflow"
									@click.stop="navigateTo(workflow.id, 'WorkflowTemplate', $event)"
								/>
							</div>
							<div :class="$style.nodes">
								<div
									v-for="(node, index) in workflow.nodes"
									:key="index"
									:class="$style.icon"
								>
									<NodeIcon
										:nodeType="node"
										:title="node.name"
										:size="18"
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
								<div v-if="workflow.user" :class="$style.line" v-text="'|'" />
								<n8n-text v-if="workflow.user" size="small" color="text-light">By {{ workflow.user.username }}</n8n-text>
							</div>
						</template>
					</TemplateCard>
				</div>
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
		loading: {
			type: Boolean,
		},
		workflows: {
			type: Array,
		},
	},
	components: {
		NodeIcon,
		TemplateCard,
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
	padding-top: var(--spacing-2xl);
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
