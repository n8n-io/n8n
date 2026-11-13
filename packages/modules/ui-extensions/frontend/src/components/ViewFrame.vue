<script setup lang="ts">
import {
	UI_EXTENSION_MESSAGE_SOURCE,
	UI_EXTENSION_PROTOCOL_VERSION,
	type UiExtensionHostMessage,
	type UiExtensionPageContext,
	uiExtensionFrameMessageSchema,
} from '@n8n/api-types';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { PAGE_SUMMARY_STRING_KEYS } from '../ui-extensions.constants';
import { contextForView } from '../ui-extensions.context';
import { buildViewDocument, VIEW_FRAME_SANDBOX } from '../ui-extensions.frame';
import type { SidePanelView, ViewRuntimeAssets } from '../ui-extensions.types';

const props = defineProps<{
	view: SidePanelView;
	/** The full context. The frame gets only what `contextForView` lets this view see. */
	pageContext: UiExtensionPageContext;
	workflowAvailableInMcp: boolean;
	runtime: ViewRuntimeAssets;
}>();

const i18n = useI18n();
const frame = useTemplateRef<HTMLIFrameElement>('frame');

const viewError = ref<string | null>(null);
const isReady = ref(false);
const hasLeftFrame = ref(false);

const theme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
// Built once: a new `srcdoc` would reload the view. The parent keys this component by view.
const srcdoc = buildViewDocument({
	runtime: props.runtime,
	source: props.view.source,
	nonce,
	theme,
});

const context = computed(() =>
	contextForView(props.view, props.pageContext, props.workflowAvailableInMcp),
);

const strings = computed<Record<string, string>>(() =>
	props.view.builtin
		? Object.fromEntries(PAGE_SUMMARY_STRING_KEYS.map((key) => [key, i18n.baseText(key)]))
		: {},
);

function sendContext() {
	const target = frame.value?.contentWindow;
	if (!target || !isReady.value || hasLeftFrame.value) return;

	const message: UiExtensionHostMessage = {
		source: UI_EXTENSION_MESSAGE_SOURCE,
		version: UI_EXTENSION_PROTOCOL_VERSION,
		type: 'context',
		context: context.value,
		strings: { ...strings.value },
	};
	// The frame has an opaque origin, so no other target origin matches it.
	target.postMessage(message, '*');
}

function onMessage(event: MessageEvent) {
	if (!frame.value || event.source !== frame.value.contentWindow) return;
	const parsed = uiExtensionFrameMessageSchema.safeParse(event.data);
	if (!parsed.success) return;

	if (parsed.data.type === 'ready') {
		isReady.value = true;
		sendContext();
	} else {
		viewError.value = parsed.data.message;
	}
}

let loadCount = 0;

/**
 * The first load is the `srcdoc` document. A later load is the view leaving its
 * document, so the frame is removed and gets no more context.
 */
function onLoad() {
	loadCount += 1;
	if (loadCount > 1) hasLeftFrame.value = true;
}

watch([context, strings], sendContext, { deep: true });

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
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
				{{ i18n.baseText('uiExtensions.view.error', { interpolate: { message: viewError } }) }}
			</N8nCallout>
			<iframe
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
