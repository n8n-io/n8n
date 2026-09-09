<script setup lang="ts">
import type { InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import { instanceAiAppPreviewDiagnosticSchema } from '@n8n/api-types';
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
		/** Built version to show. The parent renders its own empty state when there is neither this nor `liveUrl`. */
		versionId?: string;
		/** Dev-server URL for this thread; wins over the built version while present. */
		liveUrl?: string;
		/** A specific page's path within the app (e.g. "clients/:id"); the app root when omitted. */
		path?: string;
		/** CSS width of the document; `390px` mimics a phone. */
		width?: string;
	}>(),
	{ versionId: undefined, liveUrl: undefined, path: '', width: '100%' },
);

const emit = defineEmits<{
	diagnostic: [InstanceAiAppPreviewDiagnostic];
	'element-selected': [element: InspectedElement];
}>();

const i18n = useI18n();

const iframe = useTemplateRef<HTMLIFrameElement>('iframe');
const refreshCount = ref(0);
const inspecting = ref(false);

// One live document survives every publish; only the built preview remounts per version.
const iframeKey = computed(() => (props.liveUrl ? 'live' : (props.versionId ?? '')));

// A remount already loads a fresh document; carrying `r` over would keep a
// stale cache-buster on the new URL.
watch(iframeKey, () => {
	refreshCount.value = 0;
});

// `v` busts the browser cache on every new build; `r` on every manual refresh.
const iframeSrc = computed(() => {
	const pathSegments = props.path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
	// The live URL is `/apps-preview/<token>/`, so the page path appends directly.
	const base = props.liveUrl
		? `${props.liveUrl}${pathSegments}`
		: `/apps/${props.namespace}/${pathSegments}?v=${props.versionId}`;
	if (refreshCount.value === 0) return base;
	return `${base}${base.includes('?') ? '&' : '?'}r=${refreshCount.value}`;
});

function refresh() {
	refreshCount.value++;
}

// The served document is opaque-origin, so `targetOrigin` can only ever be '*'.
function postInspectCommand(type: 'inspect:enable' | 'inspect:disable') {
	iframe.value?.contentWindow?.postMessage({ source: 'n8nable', type }, '*');
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

// The document has an opaque origin (CSP `sandbox` without `allow-same-origin`),
// so `event.origin` is 'null' and the sender is identified by its window instead.
// Two scripts post from it: the app template's dev bridge (`n8n-app-preview`)
// and the served inspector (`n8nable`).
function onMessage(event: MessageEvent<unknown>) {
	if (!iframe.value?.contentWindow || event.source !== iframe.value.contentWindow) return;
	const data = event.data;
	if (typeof data !== 'object' || data === null || !('source' in data)) return;
	if (data.source === 'n8nable') {
		if ('type' in data && data.type === 'inspect:selected' && 'element' in data) {
			emit('element-selected', data.element as InspectedElement);
		}
		return;
	}
	if (data.source !== 'n8n-app-preview' || !('v' in data) || data.v !== 1) return;
	const parsed = instanceAiAppPreviewDiagnosticSchema.safeParse(data);
	if (parsed.success) emit('diagnostic', parsed.data);
}

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));

defineExpose({ refresh, enableInspect, disableInspect });
</script>

<template>
	<div :class="$style.frame" data-test-id="app-preview-frame">
		<!-- The served document is CSP-sandboxed by the backend, so the iframe needs no sandbox attribute. -->
		<iframe
			:key="iframeKey"
			ref="iframe"
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
