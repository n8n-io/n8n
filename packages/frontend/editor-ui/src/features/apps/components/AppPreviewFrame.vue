<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';

/** Picked-element description the inspector script posts back from inside the iframe. */
export interface InspectedElement {
	tagName: string;
	text?: string;
	selector?: string;
	route?: string;
}

const props = withDefaults(
	defineProps<{
		namespace: string;
		/** Built version to show. The parent renders its own empty state when there is none. */
		versionId: string;
		/** A specific page's path within the app (e.g. "clients/:id"); the app root when omitted. */
		path?: string;
		/** CSS width of the document; `390px` mimics a phone. */
		width?: string;
	}>(),
	{ path: '', width: '100%' },
);

const emit = defineEmits<{ 'element-selected': [element: InspectedElement] }>();

const i18n = useI18n();

const refreshCount = ref(0);
const inspecting = ref(false);
const iframeRef = useTemplateRef<HTMLIFrameElement>('iframeRef');

// A new build already reloads the iframe; carrying `r` over would keep a stale
// cache-buster on the new version's URL.
watch(
	() => props.versionId,
	() => {
		refreshCount.value = 0;
	},
);

// `v` busts the browser cache on every new build; `r` on every manual refresh.
const iframeSrc = computed(() => {
	const pathSegments = props.path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
	const base = `/apps/${props.namespace}/${pathSegments}?v=${props.versionId}`;
	return refreshCount.value > 0 ? `${base}&r=${refreshCount.value}` : base;
});

function refresh() {
	refreshCount.value++;
}

// The served document is opaque-origin, so `targetOrigin` can only ever be '*'.
function postInspectCommand(type: 'inspect:enable' | 'inspect:disable') {
	iframeRef.value?.contentWindow?.postMessage({ source: 'n8nable', type }, '*');
}

function enableInspect() {
	inspecting.value = true;
	postInspectCommand('inspect:enable');
}

function disableInspect() {
	inspecting.value = false;
	postInspectCommand('inspect:disable');
}

// A full document reload (new version, manual refresh, page navigation) resets
// the injected script's state, so inspect mode has to be re-armed after every load.
function onIframeLoad() {
	if (inspecting.value) postInspectCommand('inspect:enable');
}

function onMessage(event: MessageEvent) {
	if (event.source !== iframeRef.value?.contentWindow) return;
	if (event.data?.source !== 'n8nable' || event.data.type !== 'inspect:selected') return;
	emit('element-selected', event.data.element as InspectedElement);
}

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));

defineExpose({ refresh, enableInspect, disableInspect });
</script>

<template>
	<div :class="$style.frame" data-test-id="app-preview-frame">
		<!-- The served document is CSP-sandboxed by the backend, so the iframe needs no sandbox attribute. -->
		<iframe
			ref="iframeRef"
			:key="props.versionId"
			:src="iframeSrc"
			:title="i18n.baseText('instanceAi.appPreview.title')"
			:class="$style.iframe"
			:style="{ width: props.width }"
			data-test-id="instance-ai-app-preview-iframe"
			@load="onIframeLoad"
		/>
	</div>
</template>

<style lang="scss" module>
.frame {
	display: flex;
	justify-content: center;
	height: 100%;
	min-height: 0;
	background: var(--background--subtle);
}

.iframe {
	height: 100%;
	max-width: 100%;
	border: 0;
	background: var(--background--surface);
}
</style>
