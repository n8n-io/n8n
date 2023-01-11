<template>
	<div :class="$style.list" v-if="loading || workflows.length">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.workflows') }}
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div :class="$style.container">
			<TemplateCard
				v-for="(workflow, index) in workflows"
				:key="workflow.id"
				:workflow="workflow"
				:firstItem="index === 0"
				:lastItem="index === workflows.length - 1 && !loading"
				:useWorkflowButton="useWorkflowButton"
				@click="(e) => onCardClick(e, workflow.id)"
				@useWorkflow="(e) => onUseWorkflow(e, workflow.id)"
			/>
			<div v-if="infiniteScrollEnabled" ref="loader" />
			<div v-if="loading">
				<TemplateCard
					v-for="n in 4"
					:key="'index-' + n"
					:loading="true"
					:firstItem="workflows.length === 0 && n === 1"
					:lastItem="n === 4"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';
import TemplateCard from './TemplateCard.vue';

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
	},
	mounted() {
		if (this.infiniteScrollEnabled) {
			const content = document.getElementById('content');
			if (content) {
				content.addEventListener('scroll', this.onScroll);
			}
		}
	},
	destroyed() {
		const content = document.getElementById('content');
		if (content) {
			content.removeEventListener('scroll', this.onScroll);
		}
	},
	components: {
		TemplateCard,
	},
	methods: {
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
		onCardClick(event: MouseEvent, id: string) {
			this.$emit('openTemplate', { event, id });
		},
		onUseWorkflow(event: MouseEvent, id: string) {
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
