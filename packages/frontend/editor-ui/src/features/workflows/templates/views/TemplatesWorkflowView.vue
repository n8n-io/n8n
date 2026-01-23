<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useTemplateWorkflow } from '@/features/workflows/templates/utils/templateActions';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import TemplatesView from './TemplatesView.vue';
import RecommendedTemplateCard from '../recommendations/components/RecommendedTemplateCard.vue';

import { N8nButton, N8nLoading, N8nMarkdown, N8nText } from '@n8n/design-system';
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
const isPreviewVisible = ref(true);
const previewWrapperRef = ref<HTMLElement | null>(null);
let previewObserver: IntersectionObserver | null = null;

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

watch(
	previewWrapperRef,
	(newRef) => {
		if (previewObserver) {
			previewObserver.disconnect();
			previewObserver = null;
		}

		if (newRef) {
			previewObserver = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						isPreviewVisible.value = entry.isIntersecting;
					}
				},
				{ threshold: 0 },
			);
			previewObserver.observe(newRef);
		}
	},
	{ immediate: true },
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

onBeforeUnmount(() => {
	if (previewObserver) {
		previewObserver.disconnect();
		previewObserver = null;
	}
});
</script>

<template>
	<TemplatesView :full-width="true">
		<template v-if="notFoundError" #header>
			<div :class="$style.notFound">
				<N8nText color="text-base">{{ i18n.baseText('templates.workflowsNotFound') }}</N8nText>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div ref="previewWrapperRef" :class="$style.previewWrapper">
				<div :class="$style.image">
					<WorkflowPreview
						v-if="showPreview"
						:loading="loading"
						:workflow="template?.workflow"
						@close="onHidePreview"
					/>
				</div>
				<div v-if="isPreviewVisible" :class="$style.button">
					<N8nButton
						v-if="template"
						data-test-id="use-template-button"
						:label="i18n.baseText('template.buttons.tryTemplate')"
						size="large"
						@click="openTemplateSetup(templateId, $event)"
					/>
					<N8nLoading :loading="!template" :rows="1" variant="button" />
				</div>
			</div>
			<div :class="$style.contentContainer">
				<div :class="$style.content">
					<div :class="$style.templateCard">
						<RecommendedTemplateCard v-if="template" :template="template" :show-details="true">
							<template v-if="!isPreviewVisible" #belowContent>
								<N8nButton
									data-test-id="use-template-button"
									:label="i18n.baseText('template.buttons.tryTemplate')"
									size="medium"
									@click.stop="openTemplateSetup(templateId, $event)"
								/>
							</template>
						</RecommendedTemplateCard>
					</div>
					<div :class="$style.markdown" data-test-id="template-description">
						<N8nMarkdown
							:content="template?.description"
							:images="template?.image"
							:loading="loading"
						/>
					</div>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<style lang="scss" module>
.notFound {
	padding-top: var(--spacing--sm);
}

.previewWrapper {
	position: relative;
}

.image {
	width: 100%;
	height: 500px;
	border: var(--border);
	overflow: hidden;

	img {
		width: 100%;
	}
}

.button {
	position: absolute;
	bottom: var(--spacing--sm);
	left: 50%;
	transform: translateX(-50%);
	z-index: var(--canvas-select-box--z);
}

.contentContainer {
	max-width: var(--content-container--width);
	margin: var(--spacing--lg) auto 0;
	padding: 0 var(--spacing--2xl);
}

.content {
	display: flex;
	gap: var(--spacing--lg);

	@media (max-width: $breakpoint-xs) {
		display: block;
	}
}

.templateCard {
	width: 380px;
	flex-shrink: 0;
	position: sticky;
	top: var(--spacing--lg);
	align-self: flex-start;

	@media (max-width: $breakpoint-xs) {
		width: 100%;
		position: static;
		margin-bottom: var(--spacing--lg);
	}
}

.markdown {
	flex: 1;
	min-width: 0;
	margin-bottom: var(--spacing--lg);
}
</style>
