<script lang="ts" setup>
import type { PromotionWorkflowDiff, PromotionWorkflowDiffSnapshot } from '@n8n/api-types';
import type { IConnections, INodeUi, IWorkflowDb } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from 'vue';
import { N8nCallout, N8nText } from '@n8n/design-system';

const props = defineProps<{
	workflowDiff: PromotionWorkflowDiff;
}>();

const i18n = useI18n();
const iframeRef = ref<HTMLIFrameElement | null>(null);
const isIframeReady = ref(false);
const iframeError = ref<string | null>(null);

const iframeSrc = computed(() => `${window.location.origin}/workflows/demo/diff`);

function toPlainWorkflow(snapshot: PromotionWorkflowDiffSnapshot): IWorkflowDb {
	return {
		id: snapshot.id,
		name: snapshot.name,
		active: false,
		isArchived: false,
		createdAt: '1970-01-01T00:00:00.000Z',
		updatedAt: '1970-01-01T00:00:00.000Z',
		nodes: structuredClone(toRaw(snapshot.nodes)) as INodeUi[],
		connections: structuredClone(toRaw(snapshot.connections)) as IConnections,
		versionId: snapshot.versionId,
		activeVersionId: null,
	};
}

function sendDiffToIframe() {
	const iframeWindow = iframeRef.value?.contentWindow;
	if (!iframeWindow || !isIframeReady.value) return;

	iframeWindow.postMessage(
		JSON.stringify({
			command: 'openDiff',
			oldWorkflow: toPlainWorkflow(props.workflowDiff.before),
			newWorkflow: toPlainWorkflow(props.workflowDiff.after),
			tidyUp: true,
		}),
		window.location.origin,
	);
}

function onPostMessageReceived(event: MessageEvent) {
	if (event.origin !== window.location.origin) return;
	if (typeof event.data !== 'string' || !event.data.includes('"command"')) return;

	try {
		const json = JSON.parse(event.data) as { command?: string };
		if (json.command === 'n8nReady') {
			isIframeReady.value = true;
			sendDiffToIframe();
		}
	} catch {
		// Ignore malformed messages from other embeds.
	}
}

watch(
	() => props.workflowDiff.sourceWorkflowId,
	() => {
		sendDiffToIframe();
	},
);

onMounted(() => {
	window.addEventListener('message', onPostMessageReceived);
});

onUnmounted(() => {
	window.removeEventListener('message', onPostMessageReceived);
});
</script>

<template>
	<div :class="$style.root" data-test-id="promotion-review-workflow-diff">
		<N8nCallout v-if="iframeError" theme="warning">
			{{ iframeError }}
		</N8nCallout>
		<template v-else>
			<N8nText v-if="!isIframeReady" color="text-light" size="small" :class="$style.loading">
				{{ i18n.baseText('genericHelpers.loading') }}
			</N8nText>
			<iframe
				ref="iframeRef"
				:class="$style.iframe"
				:src="iframeSrc"
				title="Workflow diff"
				@error="iframeError = i18n.baseText('promotionReview.plan.workflowDiffError')"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.root {
	position: relative;
	height: 100%;
	min-height: 0;
}

.loading {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 1;
}

.iframe {
	display: block;
	width: 100%;
	height: 100%;
	border: 0;
	background: var(--color--background);
}
</style>
