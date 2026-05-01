<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useCanvasNode } from '@/features/workflows/canvas/composables/useCanvasNode';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { fetchFormPreview } from '../api';
import { FORM_STEP_PADDING, FORM_STEP_WIDTH } from '../constants';

const emit = defineEmits<{
	activate: [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const { id } = useCanvasNode();

function onActivate(event: MouseEvent) {
	emit('activate', id.value, event);
}

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();

const node = computed(() => workflowsStore.workflow.nodes.find((n: INodeUi) => n.id === id.value));
const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
const isCompletion = computed(() => node.value?.parameters?.operation === 'completion');

const previewHtml = ref('');
const iframeEl = ref<HTMLIFrameElement | null>(null);

const resolvedParameters = computed((): INodeParameters => {
	if (!node.value) return {};
	const nodeType = nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
	if (!nodeType) return node.value.parameters;
	return (
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.value.parameters,
			true,
			false,
			node.value,
			nodeType,
		) ?? node.value.parameters
	);
});

const optionsCollectionDefaults = computed(() => {
	const nodeType = nodeTypesStore.getNodeType(node.value?.type ?? '', node.value?.typeVersion);
	const collection = nodeType?.properties.find(
		(p): p is INodeProperties => p.name === 'options' && p.type === 'collection',
	);
	const items = collection?.options as INodeProperties[] | undefined;
	return Object.fromEntries(items?.map((p) => [p.name, p.default]) ?? []);
});

const triggerNode = computed(() =>
	workflowsStore.workflow.nodes.find((n: INodeUi) => n.type === FORM_TRIGGER_NODE_TYPE),
);

const triggerResolvedParameters = computed((): INodeParameters => {
	if (!triggerNode.value) return {};
	const nodeType = nodeTypesStore.getNodeType(
		triggerNode.value.type,
		triggerNode.value.typeVersion,
	);
	if (!nodeType) return triggerNode.value.parameters;
	return (
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			triggerNode.value.parameters,
			true,
			false,
			triggerNode.value,
			nodeType,
		) ?? triggerNode.value.parameters
	);
});

const previewParams = computed(() => {
	if (!node.value) return null;
	const params = resolvedParameters.value;
	const triggerParams = triggerResolvedParameters.value;
	const triggerOptions = triggerParams.options as INodeParameters | undefined;

	const options = params.options as INodeParameters | undefined;
	const customCss = (options?.customCss as string | undefined) || undefined;
	const appendAttribution =
		(options?.appendAttribution as boolean | undefined) ??
		(triggerOptions?.appendAttribution as boolean | undefined) ??
		true;

	if (isCompletion.value) {
		return {
			formTitle: (params.completionTitle as string) || '',
			formDescription: (params.completionMessage as string) ?? '',
			formFields: [],
			isCompletion: true,
			nodeVersion: node.value.typeVersion,
			customCss,
			appendAttribution,
		};
	}

	const defaults = optionsCollectionDefaults.value;
	return {
		formTitle: isTrigger.value
			? ((params.formTitle as string) ?? '')
			: (options?.formTitle as string) || (triggerParams.formTitle as string) || '',
		formDescription: isTrigger.value
			? ((params.formDescription as string) ?? '')
			: (options?.formDescription as string) || (triggerParams.formDescription as string) || '',
		buttonLabel:
			(options?.buttonLabel as string) ||
			(triggerOptions?.buttonLabel as string) ||
			(defaults.buttonLabel as string) ||
			undefined,
		formFields: (params.formFields as { values?: INodeParameters[] })?.values ?? [],
		nodeVersion: node.value.typeVersion,
		customCss,
		appendAttribution,
	};
});

// Derive the effective --container-width from the node's saved customCss.
// Falls back to the handlebars default (448px) when not overridden.
const effectiveContainerWidth = computed(() => {
	const options = resolvedParameters.value.options as INodeParameters | undefined;
	const css = (options?.customCss as string | undefined) ?? '';
	const match = css.match(/--container-width\s*:\s*(\d+(?:\.\d+)?)px/);
	return match ? Math.round(parseFloat(match[1])) : 448;
});

// The iframe must exceed 500px so the form template's mobile breakpoint never fires.
// We also keep 28px of breathing room on each side of the form card.
const iframeWidth = computed(() => Math.max(504, effectiveContainerWidth.value + 56));
const iframeZoom = computed(() => FORM_STEP_WIDTH / iframeWidth.value);

async function fetchPreview() {
	if (!previewParams.value) return;

	try {
		const html = await fetchFormPreview(rootStore.restUrl, previewParams.value);
		if (html) previewHtml.value = html;
	} catch {
		// preview is best-effort — silently fail
	}
}

function onIframeLoad() {
	const iframe = iframeEl.value;
	if (!iframe?.contentDocument) return;
	const h = iframe.contentDocument.documentElement.scrollHeight;
	iframe.style.height = `${h}px`;
}

const debouncedFetch = useDebounceFn(fetchPreview, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

// Use a serialized key so the fetch is only triggered when preview-relevant
// data actually changes. Without this, any workflow node mutation (e.g. an
// issues update that re-assigns nodes[i] = node) would cause every FormStepCard
// to re-fetch, even though the form content hasn't changed.
const previewParamsKey = computed(() => JSON.stringify(previewParams.value));

watch(
	previewParamsKey,
	() => {
		void debouncedFetch();
	},
	{ immediate: true },
);
</script>

<template>
	<div
		class="n8n-form-preview"
		:style="{ width: `${FORM_STEP_WIDTH}px`, padding: `${FORM_STEP_PADDING}px 0` }"
		@dblclick.stop="onActivate"
	>
		<div class="n8n-form-preview__card-positioner">
			<div class="n8n-form-preview__toolbar">
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="clipboard-list"
					:icon-only="false"
					:label="i18n.baseText('formStep.editForm')"
					class="n8n-form-preview__edit-button"
					@click.stop="onActivate"
				/>
			</div>
			<div class="n8n-form-preview__card">
				<iframe
					v-if="previewHtml"
					ref="iframeEl"
					:srcdoc="previewHtml"
					sandbox="allow-same-origin"
					scrolling="no"
					class="n8n-form-preview__iframe"
					:style="{ zoom: iframeZoom, width: `${iframeWidth}px` }"
					@load="onIframeLoad"
				/>
				<div v-else class="n8n-form-preview__skeleton" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.n8n-form-preview {
	/* width and padding driven by FORM_STEP_WIDTH / FORM_STEP_PADDING from forms/constants.ts */
	pointer-events: auto;
	user-select: none;
	cursor: default;
}

.n8n-form-preview__card-positioner {
	position: relative;
}

.n8n-form-preview__toolbar {
	position: absolute;
	bottom: 100%;
	right: 0;
	display: flex;
	justify-content: flex-end;
	opacity: 0;
	transition: opacity 0.1s ease-in;
	pointer-events: none;
}

.n8n-form-preview__edit-button {
	pointer-events: auto;
}

.n8n-form-preview:hover .n8n-form-preview__toolbar {
	opacity: 1;
}

.n8n-form-preview__card {
	box-sizing: border-box;
	width: 100%;
	border: 1.5px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.n8n-form-preview__iframe {
	display: block;
	/* width and zoom driven dynamically by iframeWidth / iframeZoom computed properties */
	border: none;
	pointer-events: none;
}

.n8n-form-preview__skeleton {
	height: 160px;
	background: linear-gradient(
		90deg,
		var(--color--foreground--tint-2) 25%,
		var(--color--foreground--tint-1) 50%,
		var(--color--foreground--tint-2) 75%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}
</style>
