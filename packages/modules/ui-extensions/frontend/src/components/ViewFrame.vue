<script setup lang="ts">
import {
	UI_EXTENSION_MESSAGE_SOURCE,
	UI_EXTENSION_PROTOCOL_VERSION,
	type UiExtensionConnectMessage,
	type UiExtensionHostMessage,
	type UiExtensionPageContext,
	type UiExtensionPanelData,
	uiExtensionFrameMessageSchema,
} from '@n8n/api-types';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { builtinViewStrings, getBuiltinView } from '../ui-extensions.builtin';
import { contextForView, dataForView } from '../ui-extensions.context';
import { buildViewDocument, VIEW_FRAME_SANDBOX } from '../ui-extensions.frame';
import type { SidePanelView, ViewOpenTarget, ViewRuntimeAssets } from '../ui-extensions.types';

const props = defineProps<{
	view: SidePanelView;
	/** The full context. The frame gets only what `contextForView` lets this view see. */
	pageContext: UiExtensionPageContext;
	workflowAvailableInMcp: boolean;
	runtime: ViewRuntimeAssets;
	/** Run and service data. The frame gets it only for a built-in view. */
	panelData: UiExtensionPanelData;
	/** The editor's locale, for date and number formatting in the view. */
	locale: string;
}>();

const emit = defineEmits<{
	refresh: [];
	open: [target: ViewOpenTarget];
}>();

const i18n = useI18n();
const frame = useTemplateRef<HTMLIFrameElement>('frame');

const viewError = ref<string | null>(null);
const hasLeftFrame = ref(false);

// No theme means that the editor follows the system theme, and the frame does too.
const editorTheme = document.body.getAttribute('data-theme');
const theme = editorTheme === 'dark' || editorTheme === 'light' ? editorTheme : undefined;
const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
// Built once: a new `srcdoc` would reload the view. The parent keys this component by view.
let srcdoc = '';
try {
	srcdoc = buildViewDocument({ runtime: props.runtime, source: props.view.source, nonce, theme });
} catch (error) {
	viewError.value = error instanceof Error ? error.message : String(error);
}

const context = computed(() =>
	contextForView(props.view, props.pageContext, props.workflowAvailableInMcp),
);

const data = computed(() => dataForView(props.view, props.panelData));

// A built-in view fills each `{name}` placeholder itself, with `n8n.t(key, params)`.
const strings = computed<Record<string, string>>(() => {
	const builtin = props.view.builtin ? getBuiltinView(props.view.id) : undefined;
	return builtin ? builtinViewStrings(builtin, (key, options) => i18n.baseText(key, options)) : {};
});

const errorText = computed(() =>
	viewError.value === null
		? ''
		: i18n.baseText(
				props.view.builtin ? 'uiExtensions.view.builtinError' : 'uiExtensions.view.error',
				{
					interpolate: { message: viewError.value },
				},
			),
);

/** The channel to the runtime document that sent the first `ready`. */
let channel: MessageChannel | null = null;

function sendContext() {
	if (!channel || hasLeftFrame.value) return;

	const message: UiExtensionHostMessage = {
		source: UI_EXTENSION_MESSAGE_SOURCE,
		version: UI_EXTENSION_PROTOCOL_VERSION,
		type: 'context',
		context: context.value,
		strings: { ...strings.value },
		locale: props.locale,
		...(data.value && { data: data.value }),
	};
	channel.port1.postMessage(message);
}

/** Only built-in views may ask the editor to fetch data or to open something. */
function onFrameMessage(message: unknown) {
	const parsed = uiExtensionFrameMessageSchema.safeParse(message);
	if (!parsed.success) return;
	const frameMessage = parsed.data;
	if (frameMessage.type === 'error') {
		viewError.value = frameMessage.message;
		return;
	}
	if (!props.view.builtin || hasLeftFrame.value) return;
	if (frameMessage.type === 'refresh') emit('refresh');
	if (frameMessage.type === 'open') emit('open', frameMessage.target);
}

/**
 * The runtime posts `ready` once, before any view code runs. The answer hands
 * it a port, and the context goes only over that port. A page that the view
 * opens later is a new document, so it cannot hold the port or get the context.
 */
function onWindowMessage(event: MessageEvent) {
	const target = frame.value?.contentWindow;
	if (channel || !target || event.source !== target) return;
	const parsed = uiExtensionFrameMessageSchema.safeParse(event.data);
	if (!parsed.success) return;
	if (parsed.data.type === 'error') {
		viewError.value = parsed.data.message;
		return;
	}

	channel = new MessageChannel();
	channel.port1.onmessage = (portEvent) => onFrameMessage(portEvent.data);
	// The frame has an opaque origin, so no other target origin matches it.
	const connect: UiExtensionConnectMessage = {
		source: UI_EXTENSION_MESSAGE_SOURCE,
		version: UI_EXTENSION_PROTOCOL_VERSION,
		type: 'connect',
	};
	target.postMessage(connect, '*', [channel.port2]);
	window.removeEventListener('message', onWindowMessage);
	sendContext();
}

let loadCount = 0;

/**
 * The first load is the `srcdoc` document. A later load is the view leaving its
 * document, so the frame is removed.
 */
function onLoad() {
	loadCount += 1;
	if (loadCount <= 1) return;
	hasLeftFrame.value = true;
	channel?.port1.close();
}

watch([context, strings, data, () => props.locale], sendContext, { deep: true });

onMounted(() => window.addEventListener('message', onWindowMessage));
onBeforeUnmount(() => {
	window.removeEventListener('message', onWindowMessage);
	channel?.port1.close();
});
</script>

<template>
	<div :class="$style.container">
		<N8nCallout
			v-if="hasLeftFrame"
			theme="danger"
			:class="$style.callout"
			data-test-id="ui-extensions-view-left"
		>
			{{ i18n.baseText('uiExtensions.view.leftFrame') }}
		</N8nCallout>
		<template v-else>
			<N8nCallout
				v-if="viewError"
				theme="danger"
				:class="$style.callout"
				data-test-id="ui-extensions-view-error"
			>
				{{ errorText }}
			</N8nCallout>
			<iframe
				v-if="srcdoc"
				ref="frame"
				:class="$style.frame"
				:sandbox="VIEW_FRAME_SANDBOX"
				:srcdoc="srcdoc"
				:title="view.title"
				data-test-id="ui-extensions-view-frame"
				@load="onLoad"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.callout {
	margin: var(--spacing--xs);
}

.frame {
	flex: 1;
	width: 100%;
	border: none;
}
</style>
