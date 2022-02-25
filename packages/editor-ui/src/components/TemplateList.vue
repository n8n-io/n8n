<template>
	<div :class="$style.list" v-if="loading || workflows.length">
		<div :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ $locale.baseText('templates.workflows') }}
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div :class="$style.container">
			<div
				v-for="(workflow, index) in workflows"
				:key="'workflow-' + index"
				@click="navigateTo(workflow.id, 'TemplatesWorkflowView', $event)"
			>
				<TemplateCard
					:workflow="workflow"
					:firstItem="index === 0"
					:lastItem="index === workflows.length - 1 && !loading"
					:useWorkflowButton="useWorkflowButton"
				/>
			</div>
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
import { genericHelpers } from '@/components/mixins/genericHelpers';
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
			window.addEventListener('scroll', this.onScroll);
		}
	},
	destroyed() {
		window.removeEventListener('scroll', this.onScroll);
	},
	components: {
		TemplateCard,
	},
	methods: {
		navigateTo(id: string, page: string, e: PointerEvent) {
			if (page === 'WorkflowTemplate') {
				this.$telemetry.track('User inserted workflow template', {
					template_id: id,
					wf_template_repo_session_id: this.$store.getters['templates/currentSessionId'],
					source: 'collection',
				});
			}

			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: page, params: { id } });
			}
		},
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
