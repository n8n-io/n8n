<script setup lang="ts">
import type { InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import { instanceAiAppPreviewDiagnosticSchema } from '@n8n/api-types';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton } from '@n8n/design-system';
import { useSettingsStore } from '@n8n/stores/settings.store';

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
		/** `mobile` shows the document in a centered phone-sized frame. */
		device?: 'desktop' | 'mobile';
		/** Color scheme to try the document in; the app's own saved mode applies when omitted. */
		theme?: 'light' | 'dark' | 'system';
	}>(),
	{ versionId: undefined, liveUrl: undefined, path: '', device: 'desktop', theme: undefined },
);

const emit = defineEmits<{
	diagnostic: [InstanceAiAppPreviewDiagnostic];
	'element-selected': [element: InspectedElement];
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();

const iframe = useTemplateRef<HTMLIFrameElement>('iframe');
const refreshCount = ref(0);
const inspecting = ref(false);
const signingIn = ref(false);
const needsSignIn = ref(true);
const appOrigin = computed(() => settingsStore.moduleSettings.apps?.baseUrl ?? '');

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
	// The live URL is `/apps-preview/<token>/` plus, for a built preview, its `?b=` cache-buster;
	// the page path appends to the slash, before the query.
	const live = props.liveUrl ? new URL(props.liveUrl, window.location.origin) : undefined;
	const base = live
		? `${live.pathname}${pathSegments}${live.search}`
		: `${appOrigin.value}/apps/${props.namespace}/${pathSegments}?v=${props.versionId}`;
	if (refreshCount.value === 0) return base;
	return `${base}${base.includes('?') ? '&' : '?'}r=${refreshCount.value}`;
});

function refresh() {
	refreshCount.value++;
}

watch(iframeSrc, () => {
	needsSignIn.value = true;
});

function signIn() {
	signingIn.value = true;
	const version = props.versionId ? `?v=${encodeURIComponent(props.versionId)}` : '';
	window.open(
		`${appOrigin.value}/apps-auth/login/${encodeURIComponent(props.namespace)}${version}`,
		'_blank',
		'noopener',
	);
}

function onFocus() {
	if (!signingIn.value) return;
	signingIn.value = false;
	refresh();
}

// Live sandbox previews have an opaque origin. Stored builds use the app origin.
function postCommand(message: {
	type: 'inspect:enable' | 'inspect:disable' | 'theme:set';
	mode?: string;
}) {
	iframe.value?.contentWindow?.postMessage(
		{ source: 'n8nable', ...message },
		props.liveUrl ? '*' : appOrigin.value || '*',
	);
}

function postInspectCommand(type: 'inspect:enable' | 'inspect:disable') {
	postCommand({ type });
}

function postTheme() {
	if (props.theme) postCommand({ type: 'theme:set', mode: props.theme });
}

watch(() => props.theme, postTheme);

function enableInspect() {
	inspecting.value = true;
	postInspectCommand('inspect:enable');
}

function disableInspect() {
	inspecting.value = false;
	postInspectCommand('inspect:disable');
}

// A full document reload (new version, manual refresh, page navigation) resets
// the injected script's state, so inspect mode and the tried-out theme have to
// be re-applied after every load.
function onIframeLoad() {
	if (inspecting.value) postInspectCommand('inspect:enable');
	postTheme();
}

// Live previews have an opaque origin. Identify each sender by its iframe window.
function onMessage(event: MessageEvent<unknown>) {
	if (!iframe.value?.contentWindow || event.source !== iframe.value.contentWindow) return;
	const data = event.data;
	if (typeof data !== 'object' || data === null || !('source' in data)) return;
	if (data.source === 'n8nable') {
		if ('type' in data && data.type === 'auth:required') {
			needsSignIn.value = true;
			return;
		}
		if ('type' in data && data.type === 'auth:ready') {
			needsSignIn.value = false;
			return;
		}
		if ('type' in data && data.type === 'inspect:selected' && 'element' in data) {
			emit('element-selected', data.element as InspectedElement);
		}
		return;
	}
	if (data.source !== 'n8n-app-preview' || !('v' in data) || data.v !== 1) return;
	const parsed = instanceAiAppPreviewDiagnosticSchema.safeParse(data);
	if (parsed.success) emit('diagnostic', parsed.data);
}

onMounted(() => {
	window.addEventListener('message', onMessage);
	window.addEventListener('focus', onFocus);
});
onBeforeUnmount(() => {
	window.removeEventListener('message', onMessage);
	window.removeEventListener('focus', onFocus);
});

defineExpose({ refresh, enableInspect, disableInspect, src: iframeSrc });
</script>

<template>
	<div
		:class="[$style.frame, { [$style.mobile]: props.device === 'mobile' }]"
		data-test-id="app-preview-frame"
	>
		<N8nButton
			v-if="!props.liveUrl && appOrigin && needsSignIn"
			:class="$style.signIn"
			variant="subtle"
			size="small"
			@click="signIn"
		>
			{{ i18n.baseText('apps.preview.signIn') }}
		</N8nButton>
		<!-- The backend sets the document's sandbox policy. -->
		<iframe
			:key="iframeKey"
			ref="iframe"
			:src="iframeSrc"
			:title="i18n.baseText('instanceAi.appPreview.title')"
			:class="$style.iframe"
			data-test-id="instance-ai-app-preview-iframe"
			@load="onIframeLoad"
		/>
	</div>
</template>

<style lang="scss" module>
// Desktop fills the pane; the pane's own rounded border frames the document.
.frame {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
	min-height: 0;
	background: var(--background--subtle);
}

.signIn {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	z-index: 1;
}

.iframe {
	width: 100%;
	height: 100%;
	max-width: 100%;
	border: 0;
	background: var(--background--surface);
}

.mobile {
	padding: var(--spacing--lg);
	background: transparent;
}

.mobile .iframe {
	width: 390px;
	max-height: 844px;
	border: var(--border);
	border-radius: var(--radius--2xl);
	box-shadow: var(--shadow--xl);
}
</style>
