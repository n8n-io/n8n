<template>
	<TemplatesView :go-back-enabled="true">
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
						data-test-id="use-template-button"
						:label="$locale.baseText('template.buttons.useThisWorkflowButton')"
						size="large"
						@click="openTemplateSetup(templateId, $event)"
					/>
					<n8n-loading :loading="!template" :rows="1" variant="button" />
				</div>
			</div>
			<div v-else :class="$style.notFound">
				<n8n-text color="text-base">{{ $locale.baseText('templates.workflowsNotFound') }}</n8n-text>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div :class="$style.image">
				<WorkflowPreview
					v-if="showPreview"
					:loading="loading"
					:workflow="template?.workflow"
					@close="onHidePreview"
				/>
			</div>
			<div :class="$style.content">
				<div :class="$style.markdown" data-test-id="template-description">
					<n8n-markdown
						:content="template?.description"
						:images="template?.image"
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
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import TemplateDetails from '@/components/TemplateDetails.vue';
import TemplatesView from './TemplatesView.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

import type { ITemplatesWorkflowFull } from '@/Interface';
import { setPageTitle } from '@/utils/htmlUtils';
import { useTemplatesStore } from '@/stores/templates.store';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplateWorkflow } from '@/utils/templates/templateActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export default defineComponent({
	name: 'TemplatesWorkflowView',
	components: {
		TemplateDetails,
		TemplatesView,
		WorkflowPreview,
	},
	setup() {
		const externalHooks = useExternalHooks();

		return {
			externalHooks,
		};
	},
	computed: {
		...mapStores(useTemplatesStore, usePostHog),
		template(): ITemplatesWorkflowFull | null {
			return this.templatesStore.getFullTemplateById(this.templateId);
		},
		templateId() {
			return Array.isArray(this.$route.params.id)
				? this.$route.params.id[0]
				: this.$route.params.id;
		},
	},
	data() {
		return {
			loading: true,
			showPreview: true,
			notFoundError: false,
		};
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

		if (this.template && this.template.full) {
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
	methods: {
		async openTemplateSetup(id: string, e: PointerEvent) {
			await useTemplateWorkflow({
				posthogStore: this.posthogStore,
				router: this.$router,
				templateId: id,
				inNewBrowserTab: e.metaKey || e.ctrlKey,
				externalHooks: this.externalHooks,
				nodeTypesStore: useNodeTypesStore(),
				telemetry: this.$telemetry,
				templatesStore: useTemplatesStore(),
				source: 'template_preview',
			});
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
