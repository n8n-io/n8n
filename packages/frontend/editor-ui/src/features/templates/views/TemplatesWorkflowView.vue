<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useTemplateWorkflow } from '@/features/templates/utils/templateActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import TemplateDetails from '../components/TemplateDetails.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import TemplatesView from './TemplatesView.vue';

import { N8nButton, N8nHeading, N8nLoading, N8nMarkdown, N8nText } from '@n8n/design-system';
const externalHooks = useExternalHooks();
const templatesStore = useTemplatesStore();
const nodeTypesStore = useNodeTypesStore();

const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();
const documentTitle = useDocumentTitle();

const loading = ref(true);
const showPreview = ref(true);
const notFoundError = ref(false);

const templateId = computed(() =>
	Array.isArray(route.params.id) ? route.params.id[0] : route.params.id,
);

const template = computed(() => templatesStore.getFullTemplateById(templateId.value));

const openTemplateSetup = async (id: string, e: PointerEvent) => {
	await useTemplateWorkflow({
		router,
		templateId: id,
		inNewBrowserTab: e.metaKey || e.ctrlKey,
		externalHooks,
		nodeTypesStore,
		telemetry,
		templatesStore,
		source: 'template_preview',
	});
};

const onHidePreview = () => {
	showPreview.value = false;
};

const scrollToTop = () => {
	const contentArea = document.getElementById('content');

	if (contentArea) {
		contentArea.scrollTo({
			top: 0,
		});
	}
};

watch(
	() => template.value,
	(newTemplate) => {
		if (newTemplate) {
			documentTitle.set(`Template template: ${newTemplate.name}`);
		} else {
			documentTitle.set('Templates');
		}
	},
);

onMounted(async () => {
	scrollToTop();

	if (template.value?.full) {
		loading.value = false;
		return;
	}

	try {
		await templatesStore.fetchTemplateById(templateId.value);
	} catch (e) {
		notFoundError.value = true;
	}

	loading.value = false;
});
</script>

<template>
	<TemplatesView :go-back-enabled="true">
		<template #header>
			<div v-if="!notFoundError" :class="$style.wrapper">
				<div :class="$style.title">
					<N8nHeading v-if="template && template.name" tag="h1" size="2xlarge">{{
						template.name
					}}</N8nHeading>
					<N8nText v-if="template && template.name" color="text-base" size="small">
						{{ i18n.baseText('generic.workflow') }}
					</N8nText>
					<N8nLoading :loading="!template || !template.name" :rows="2" variant="h1" />
				</div>
				<div :class="$style.button">
					<N8nButton
						v-if="template"
						data-test-id="use-template-button"
						:label="i18n.baseText('template.buttons.useThisWorkflowButton')"
						size="large"
						@click="openTemplateSetup(templateId, $event)"
					/>
					<N8nLoading :loading="!template" :rows="1" variant="button" />
				</div>
			</div>
			<div v-else :class="$style.notFound">
				<N8nText color="text-base">{{ i18n.baseText('templates.workflowsNotFound') }}</N8nText>
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
					<N8nMarkdown
						:content="template?.description"
						:images="template?.image"
						:loading="loading"
					/>
				</div>
				<div :class="$style.details">
					<TemplateDetails
						:block-title="i18n.baseText('template.details.appsInTheWorkflow')"
						:loading="loading"
						:template="template"
					/>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: space-between;
}

.notFound {
	padding-top: var(--spacing--xl);
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
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;

	img {
		width: 100%;
	}
}

.content {
	padding: var(--spacing--2xl) 0;
	display: flex;
	justify-content: space-between;

	@media (max-width: $breakpoint-xs) {
		display: block;
	}
}

.markdown {
	width: calc(100% - 180px);
	padding-right: var(--spacing--2xl);
	margin-bottom: var(--spacing--lg);

	@media (max-width: $breakpoint-xs) {
		width: 100%;
	}
}

.details {
	width: 180px;
}
</style>
