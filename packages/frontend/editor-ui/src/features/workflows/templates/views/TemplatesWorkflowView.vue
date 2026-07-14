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
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import WorkflowPreviewHost from '@/app/components/WorkflowPreviewHost.vue';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import TemplatesView from './TemplatesView.vue';
import RecommendedTemplateCard from '../recommendations/components/RecommendedTemplateCard.vue';

import { N8nButton, N8nMarkdown, N8nText } from '@n8n/design-system';
import type { IWorkflowTemplate } from '@n8n/rest-api-client';

const externalHooks = useExternalHooks();
const templatesStore = useTemplatesStore();
const nodeTypesStore = useNodeTypesStore();

const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();
const documentTitle = useDocumentTitle();
const instanceAiHandoff = useInstanceAiHandoff();
const instanceAiAvailable = useInstanceAiAvailable();

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

const startWithAi = async () => {
	if (!template.value || !instanceAiAvailable.value) return;
	const projectId = await ensurePersonalProjectId();
	if (!projectId) return;

	await instanceAiHandoff.startThread(
		projectId,
		i18n.baseText('instanceAi.launch.template.message', {
			interpolate: { name: template.value.name, id: templateId.value },
		}),
		undefined,
		undefined,
		{
			launch: {
				source: 'template-view',
				origin: 'internal',
				sourceContext: { templateId: templateId.value, templateName: template.value.name },
			},
		},
	);
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

	// The native preview canvas renders node icons/shapes from the node types
	// store; community nodes used by templates resolve through previews.
	if (nodeTypesStore.allNodeTypes.length === 0) {
		void nodeTypesStore.getNodeTypes();
	}
	void nodeTypesStore.fetchCommunityNodePreviews();

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

const strippedWorkflow = computed<IWorkflowTemplate['workflow'] | undefined>(() => {
	if (!template.value?.workflow) return undefined;

	if (template.value.readyToDemo) return template.value.workflow;

	return {
		...template.value.workflow,
		pinData: {},
	};
});

// Synthetic preview document id — template workflows have no instance
// workflow id, so key by the template id.
const previewDocumentId = computed(() =>
	createWorkflowDocumentId(`template-${templateId.value}`, 'preview'),
);
</script>

<template>
	<TemplatesView :full-width="true">
		<template v-if="notFoundError" #header>
			<div :class="$style.notFound">
				<N8nText color="text-base">{{ i18n.baseText('templates.workflowsNotFound') }}</N8nText>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div :class="$style.previewWrapper">
				<div :class="$style.image">
					<WorkflowPreviewHost
						v-if="showPreview && !loading && strippedWorkflow"
						:document-id="previewDocumentId"
						:workflow="strippedWorkflow"
					/>
				</div>
			</div>
			<div :class="$style.contentContainer">
				<div :class="$style.content">
					<div :class="$style.templateCard">
						<RecommendedTemplateCard v-if="template" :template="template" :show-details="true">
							<template #belowContent>
								<div :class="$style.templateActions">
									<N8nButton
										data-test-id="use-template-button"
										:label="i18n.baseText('template.buttons.tryTemplate')"
										size="large"
										@click.stop="openTemplateSetup(templateId, $event)"
									/>
									<N8nButton
										v-if="instanceAiAvailable"
										data-test-id="start-with-ai-button"
										:class="$style.startWithAi"
										:label="i18n.baseText('template.buttons.startWithAi')"
										variant="ghost"
										icon="sparkles"
										size="large"
										@click.stop="startWithAi"
									/>
								</div>
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

.templateActions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

// Same layered-background technique as the design system's Ask Assistant
// button; the doubled class selector outranks N8nButton's background rules.
.startWithAi.startWithAi {
	// Icon inherits currentColor; the label is repainted with the gradient below.
	--button--color: var(--assistant--color--highlight-2);
	border: 1px solid transparent;
	background:
		var(--assistant--button--color--background--gradient) padding-box,
		var(--assistant--color--highlight-gradient) border-box;

	&:hover {
		background:
			var(--assistant--button--color--background--hover) padding-box,
			var(--assistant--button--color--background--gradient--hover) padding-box,
			var(--assistant--color--highlight-gradient--reverse) border-box;
	}

	&:active {
		background:
			var(--assistant--button--color--background--active) padding-box,
			var(--assistant--button--color--background--gradient--active) padding-box,
			var(--assistant--color--highlight-gradient--reverse) border-box;
	}

	span {
		background: var(--assistant--color--highlight-gradient);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
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
