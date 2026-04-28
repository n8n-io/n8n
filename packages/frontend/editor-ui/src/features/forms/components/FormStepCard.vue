<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useCanvasNode } from '@/features/workflows/canvas/composables/useCanvasNode';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeParameters } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { fetchFormPreview } from '../api';

const emit = defineEmits<{
	activate: [id: string, event: MouseEvent];
}>();

const { id } = useCanvasNode();

function onActivate(event: MouseEvent) {
	emit('activate', id.value, event);
}

const workflowsStore = useWorkflowsStore();
const rootStore = useRootStore();

const node = computed(() => workflowsStore.workflow.nodes.find((n: INodeUi) => n.id === id.value));
const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
const isCompletion = computed(() => node.value?.parameters?.operation === 'completion');

const previewHtml = ref('');
const iframeEl = ref<HTMLIFrameElement | null>(null);

const previewParams = computed(() => {
	const params = node.value?.parameters;
	if (!params) return null;

	if (isCompletion.value) {
		return {
			formTitle: (params.completionTitle as string) || 'Form Submitted',
			formDescription: (params.completionMessage as string) ?? '',
			formFields: [],
			buttonLabel: undefined,
			nodeVersion: node.value?.typeVersion,
		};
	}

	return {
		formTitle: isTrigger.value
			? ((params.formTitle as string) ?? '')
			: (((params.options as INodeParameters)?.formTitle as string) ?? ''),
		formDescription: isTrigger.value
			? ((params.formDescription as string) ?? '')
			: (((params.options as INodeParameters)?.formDescription as string) ?? ''),
		buttonLabel: ((params.options as INodeParameters)?.buttonLabel as string) || undefined,
		formFields: (params.formFields as { values?: INodeParameters[] })?.values ?? [],
		nodeVersion: node.value?.typeVersion,
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
	<div class="n8n-form-preview" @dblclick.stop="onActivate">
		<div class="n8n-form-preview__card">
			<iframe
				v-if="previewHtml"
				ref="iframeEl"
				:srcdoc="previewHtml"
				sandbox="allow-same-origin"
				class="n8n-form-preview__iframe"
				@load="onIframeLoad"
			/>
			<div v-else class="n8n-form-preview__skeleton" />
		</div>
	</div>
</template>

<style scoped>
.n8n-form-preview {
	/*
	 * 228px outer width; VueFlow measures this for node sizing.
	 * Canvas mapping shifts X by -66px to centre the card on the original 96px node.
	 */
	width: 228px;
	padding: 20px 0;
	position: relative;
	pointer-events: auto;
	user-select: none;
	cursor: default;
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
	 * 560px > 500px mobile breakpoint → desktop card styles always apply.
	 * Card (448px) centred in 560px iframe → 56px left margin in iframe.
	 * After zoom 0.45: 56 × 0.45 = 25.2px visual from iframe left.
	 * 504px > 500px mobile breakpoint → desktop card styles always apply.
	 * Card (448px) centred in 504px iframe → 28px left margin in iframe.
	 * After zoom 0.45: 28 × 0.45 = 12.6px from iframe left — no negative margin needed.
	 * Inner card area = 228px − 3px border = 225px; card sits at 12.6 → 214.2px. ✓
	 */
	width: 504px;
	border: none;
	pointer-events: none;
	zoom: 0.45;
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
