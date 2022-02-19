<template>
	<TemplatesView>
		<div :class="$style.template">
			<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
				<div :class="$style.header">
					<go-back-button />
					<div :class="$style.wrapper">
						<div :class="$style.title">
							<n8n-heading v-if="!loading" tag="h1" size="2xlarge">{{ template.name }}</n8n-heading>
							<n8n-text v-if="!loading" color="text-base" size="small">
								{{ $locale.baseText('templates.workflow') }}
							</n8n-text>
							<n8n-loading :animated="true" :loading="loading" :rows="2" variant="h1" />
						</div>
						<div :class="$style.button">
							<n8n-button
								v-if="!loading"
								:label="$locale.baseText('template.buttons.useThisWorkflowButton')"
								size="large"
								@click="navigateTo(template.id, 'WorkflowTemplate', $event)"
							/>
							<n8n-loading :animated="true" :loading="loading" :rows="1" variant="button" />
						</div>
					</div>
				</div>
				<div>
					<div :class="$style.image">
						<WorkflowPreview
							v-if="showPreview"
							:workflow="template && template.workflow"
							@close="onHidePreview"
							:loading="loading"
						/>
					</div>
					<div :class="$style.content">
						<div :class="$style.markdown">
							<n8n-markdown
								:content="template && template.description"
								:images="template && template.image"
								:loading="loading"
							/>
						</div>
						<div :class="$style.details">
							<TemplateDetails
								:block-title="$locale.baseText('template.details.appsInTheWorkflow')"
								:loading="loading"
								:template="template"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</TemplatesView>
</template>

<script lang="ts">
import GoBackButton from '@/components/GoBackButton.vue';
import TemplateDetails from '@/components/TemplateDetails.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import TemplatesView from './TemplatesView.vue';

import { IN8nTemplate } from '@/Interface';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'TemplatesWorkflowView',
	components: {
		GoBackButton,
		TemplateDetails,
		WorkflowPreview,
		TemplatesView,
	},
	computed: {
		templateId() {
			return this.$route.params.id;
		},
		isMenuCollapsed() {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
		template(): IN8nTemplate {
			return this.$store.getters['templates/getTemplateById'](this.templateId);
		},
	},
	data() {
		return {
			loading: true,
			showPreview: true,
		};
	},
	methods: {
		navigateTo(id: string, page: string, e: PointerEvent) {
			if (page === 'WorkflowTemplate') {
				this.$store.dispatch('templates/setTemplateSessionId', null);
				this.$telemetry.track('User inserted workflow template', {
					template_id: id,
					wf_template_repo_session_id: this.$store.getters['templates/currentSessionId'],
					source: 'workflow',
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
		onHidePreview() {
			this.showPreview = false;
		},
		scrollToTop() {
			window.scrollTo({
				top: 0,
			});
		},
	},
	async mounted() {
		this.scrollToTop();

		try {
			await this.$store.dispatch('templates/getTemplateById', this.templateId);
		} catch (e){
			this.$showMessage({
				title: 'Error',
				message: 'Could not find workflow template',
				type: 'error',
			});
		}

		this.loading = false;
	},
});
</script>

<style lang="scss" module>
.template {
	width: calc(100vw - 20px);
	height: 100%;
	min-height: 100vh;
	position: relative;
	display: flex;
	justify-content: center;
	background-color: var(--color-background-light);
}

.container {
	width: 100%;
	max-width: 1024px;
	margin: 0 var(--spacing-3xl) 0 129px;
	padding: var(--spacing-3xl) 0 var(--spacing-3xl);

	@media (max-width: $--breakpoint-md) {
		width: 900px;
		margin: 0 var(--spacing-2xl) 0 113px;
		padding: var(--spacing-2xl) 0 var(--spacing-2xl);
	}
}

.expanded {
	margin-left: 248px;

	@media (max-width: $--breakpoint-2xs) {
		margin-left: 113px;
	}
}

.header {
	padding: 0px 0px var(--spacing-2xl);
	display: flex;
	flex-direction: column;
}

.wrapper {
	padding: var(--spacing-s) 0 0;
	display: flex;
	justify-content: space-between;
}

.title {
	width: 75%;
}

.button {
	display: block;
}

.image {
	width: 100%;

	img {
		width: 100%;
	}
}

.content {
	padding: var(--spacing-2xl) 0;
	display: flex;
	justify-content: space-between;
}

.markdown {
	width: calc(100% - 180px);
	padding-right: var(--spacing-2xl);
}

.spacer {
	margin: 56px;
}

.details {
	width: 180px;

	@media (max-width: $--breakpoint-xs) {
		width: auto;
	}
}
</style>
