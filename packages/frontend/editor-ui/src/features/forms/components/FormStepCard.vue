<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
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
import { FORM_STEP_IFRAME_ZOOM, FORM_STEP_PADDING, FORM_STEP_WIDTH } from '../constants';

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

const previewParams = computed(() => {
	if (!node.value) return null;
	const params = resolvedParameters.value;

	if (isCompletion.value) {
		return {
			formTitle: (params.completionTitle as string) || '',
			formDescription: (params.completionMessage as string) ?? '',
			formFields: [],
			isCompletion: true,
			nodeVersion: node.value.typeVersion,
		};
	}

	const options = params.options as INodeParameters | undefined;
	const defaults = optionsCollectionDefaults.value;
	return {
		formTitle: isTrigger.value
			? ((params.formTitle as string) ?? '')
			: ((options?.formTitle as string) ?? (defaults.formTitle as string) ?? ''),
		formDescription: isTrigger.value
			? ((params.formDescription as string) ?? '')
			: ((options?.formDescription as string) ?? (defaults.formDescription as string) ?? ''),
		buttonLabel: (options?.buttonLabel as string) || (defaults.buttonLabel as string) || undefined,
		formFields: (params.formFields as { values?: INodeParameters[] })?.values ?? [],
		nodeVersion: node.value.typeVersion,
	};
});

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

watch(
	previewParams,
	() => {
		void debouncedFetch();
	},
	{ immediate: true, deep: true },
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
				<button class="n8n-form-preview__edit-button" @click.stop="onActivate">
					<N8nIcon icon="pencil" size="xsmall" />
					<span>{{ i18n.baseText('formStep.editForm') }}</span>
				</button>
			</div>
			<div class="n8n-form-preview__card">
				<iframe
					v-if="previewHtml"
					ref="iframeEl"
					:srcdoc="previewHtml"
					sandbox="allow-same-origin"
					scrolling="no"
					class="n8n-form-preview__iframe"
					:style="{ zoom: FORM_STEP_IFRAME_ZOOM }"
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
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: none;
	border: none;
	border-radius: var(--radius);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	cursor: pointer;
	pointer-events: auto;
}

.n8n-form-preview__edit-button :deep(svg path) {
	fill: currentColor;
	stroke: none;
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
	/*
	 * 504px > 500px mobile breakpoint → desktop card styles (border, shadow) always apply.
	 * Card (448px) centred in 504px iframe → 28px left margin → 12.6px visual (zoom 0.45).
	 * Inner card area = FORM_STEP_WIDTH − 3px border = 225px; card sits at 12.6 → 214.2px.
	 * zoom is set via :style binding from FORM_STEP_IFRAME_ZOOM in forms/constants.ts.
	 */
	width: 504px;
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
