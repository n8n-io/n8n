<template>
	<TemplatesView :goBackEnabled="true">
		<template #header>
			<div v-if="!notFoundError" :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading v-if="template && template.name" tag="h1" size="2xlarge">{{
						template.name
					}}</n8n-heading>
					<n8n-text v-if="template && template.name" color="text-base" size="small">
						{{ $locale.baseText('generic.workflow') }}
					</n8n-text>
					<n8n-loading :loading="!template || !template.name" :rows="2" variant="h1" />
				</div>
				<div :class="$style.button">
					<n8n-button
						v-if="template"
						:label="$locale.baseText('template.buttons.useThisWorkflowButton')"
						size="large"
						@click="openWorkflow(template.id, $event)"
					/>
					<n8n-loading :loading="!template" :rows="1" variant="button" />
				</div>
			</div>
			<div :class="$style.notFound" v-else>
				<n8n-text color="text-base">{{ $locale.baseText('templates.workflowsNotFound') }}</n8n-text>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div :class="$style.image">
				<WorkflowPreview
					v-if="showPreview"
					:loading="loading"
					:workflow="template && template.workflow"
					@close="onHidePreview"
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
		</template>
	</TemplatesView>
</template>

<script lang="ts">
import TemplateDetails from '@/components/TemplateDetails.vue';
import TemplatesView from './TemplatesView.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

import { ITemplatesWorkflow, ITemplatesWorkflowFull } from '@/Interface';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';
import { setPageTitle } from '@/utils';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useTemplatesStore } from '@/stores/templates';

export default mixins(workflowHelpers).extend({
	name: 'TemplatesWorkflowView',
	components: {
		TemplateDetails,
		TemplatesView,
		WorkflowPreview,
	},
	computed: {
		...mapStores(useTemplatesStore),
		template(): ITemplatesWorkflow | ITemplatesWorkflowFull {
			return this.templatesStore.getTemplateById(this.templateId);
		},
		templateId() {
			return this.$route.params.id;
		},
	},
	data() {
		return {
			loading: true,
			showPreview: true,
			notFoundError: false,
		};
	},
	methods: {
		openWorkflow(id: string, e: PointerEvent) {
			const telemetryPayload = {
				source: 'workflow',
				template_id: id,
				wf_template_repo_session_id: this.templatesStore.currentSessionId,
			};

			this.$externalHooks().run('templatesWorkflowView.openWorkflow', telemetryPayload);
			this.$telemetry.track('User inserted workflow template', telemetryPayload);

			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: VIEWS.TEMPLATE_IMPORT, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: VIEWS.TEMPLATE_IMPORT, params: { id } });
			}
		},
		onHidePreview() {
			this.showPreview = false;
		},
		scrollToTop() {
			const contentArea = document.getElementById('content');

			if (contentArea) {
				contentArea.scrollTo({
					top: 0,
				});
			}
		},
	},
	watch: {
		template(template: ITemplatesWorkflowFull) {
			if (template) {
				setPageTitle(`n8n - Template template: ${template.name}`);
			} else {
				setPageTitle('n8n - Templates');
			}
		},
	},
	async mounted() {
		this.scrollToTop();

		if (this.template && (this.template as ITemplatesWorkflowFull).full) {
			this.loading = false;
			return;
		}

		try {
			await this.templatesStore.fetchTemplateById(this.templateId);
		} catch (e) {
			this.notFoundError = true;
		}

		this.loading = false;
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: space-between;
}

.notFound {
	padding-top: var(--spacing-xl);
}

.title {
	width: 75%;
}

.button {
	display: block;
}

.image {
	width: 100%;
	height: 500px;
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	overflow: hidden;

	img {
		width: 100%;
	}
}

.content {
	padding: var(--spacing-2xl) 0;
	display: flex;
	justify-content: space-between;

	@media (max-width: $breakpoint-xs) {
		display: block;
	}
}

.markdown {
	width: calc(100% - 180px);
	padding-right: var(--spacing-2xl);
	margin-bottom: var(--spacing-l);

	@media (max-width: $breakpoint-xs) {
		width: 100%;
	}
}

.details {
	width: 180px;
}
</style>
