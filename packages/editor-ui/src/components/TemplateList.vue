<template>
	<div v-if="loading || workflows.length" :class="$style.list">
		<div v-if="!simpleView" :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.workflows') }}
				<span v-if="totalCount > 0" data-test-id="template-count-label">({{ totalCount }})</span>
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div :class="$style.container">
			<TemplateCard
				v-for="(workflow, index) in workflows"
				:key="workflow.id"
				:workflow="workflow"
				:first-item="index === 0"
				:simple-view="simpleView"
				:last-item="index === workflows.length - 1 && !loading"
				:use-workflow-button="useWorkflowButton"
				@click="(e) => onCardClick(e, workflow.id)"
				@use-workflow="(e) => onUseWorkflow(e, workflow.id)"
			/>
			<div v-if="infiniteScrollEnabled" ref="loader" />
			<div v-if="loading" data-test-id="templates-loading-container">
				<TemplateCard
					v-for="n in 4"
					:key="'index-' + n"
					:loading="true"
					:first-item="workflows.length === 0 && n === 1"
					:last-item="n === 4"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import TemplateCard from './TemplateCard.vue';
import type { ITemplatesWorkflow } from '@/Interface';

export default defineComponent({
	name: 'TemplateList',
	components: {
		TemplateCard,
	},
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
			type: Array as PropType<ITemplatesWorkflow[]>,
			default: () => [],
		},
		totalWorkflows: {
			type: Number,
			default: 0,
		},
		simpleView: {
			type: Boolean,
			default: false,
		},
		totalCount: {
			type: Number,
			default: 0,
		},
	},
	mounted() {
		if (this.infiniteScrollEnabled) {
			const content = document.getElementById('content');
			if (content) {
				content.addEventListener('scroll', this.onScroll);
			}
		}
	},
	beforeUnmount() {
		const content = document.getElementById('content');
		if (content) {
			content.removeEventListener('scroll', this.onScroll);
		}
	},
	methods: {
		onScroll() {
			const loaderRef = this.$refs.loader as HTMLElement | undefined;
			if (!loaderRef || this.loading) {
				return;
			}

			const rect = loaderRef.getBoundingClientRect();
			const inView =
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
				rect.right <= (window.innerWidth || document.documentElement.clientWidth);

			if (inView) {
				this.$emit('loadMore');
			}
		},
		onCardClick(event: MouseEvent, id: number) {
			this.$emit('openTemplate', { event, id });
		},
		onUseWorkflow(event: MouseEvent, id: number) {
			this.$emit('useWorkflow', { event, id });
		},
	},
});
</script>

<style lang="scss" module>
.header {
	padding-bottom: var(--spacing-2xs);
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
</style>
