<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	namespace: string;
	/** Latest built version. Absent until the first build; the frame shows an empty state instead. */
	versionId?: string;
}>();

const i18n = useI18n();

const refreshCount = ref(0);

// A new build already reloads the iframe; carrying `r` over would keep a stale
// cache-buster on the new version's URL.
watch(
	() => props.versionId,
	() => {
		refreshCount.value = 0;
	},
);

const appUrl = computed(() => `/apps/${props.namespace}/`);

// `v` busts the browser cache on every new build; `r` on every manual refresh.
const iframeSrc = computed(() => {
	const base = `${appUrl.value}?v=${props.versionId ?? ''}`;
	return refreshCount.value > 0 ? `${base}&r=${refreshCount.value}` : base;
});

function refresh() {
	refreshCount.value++;
}
</script>

<template>
	<div :class="$style.frame" data-test-id="app-preview-frame">
		<div :class="$style.toolbar">
			<N8nIconButton
				icon="refresh-cw"
				variant="ghost"
				size="small"
				:disabled="!props.versionId"
				:aria-label="i18n.baseText('instanceAi.appPreview.refresh')"
				:title="i18n.baseText('instanceAi.appPreview.refresh')"
				data-test-id="app-preview-refresh"
				@click="refresh"
			/>
			<N8nIconButton
				icon="external-link"
				variant="ghost"
				size="small"
				:href="appUrl"
				target="_blank"
				:aria-label="i18n.baseText('instanceAi.appPreview.openInNewTab')"
				:title="i18n.baseText('instanceAi.appPreview.openInNewTab')"
				data-test-id="app-preview-open-in-new-tab"
			/>
		</div>
		<!-- The served document is CSP-sandboxed by the backend, so the iframe needs no sandbox attribute. -->
		<iframe
			v-if="props.versionId"
			:key="props.versionId"
			:src="iframeSrc"
			:title="i18n.baseText('instanceAi.appPreview.title')"
			:class="$style.iframe"
			data-test-id="instance-ai-app-preview-iframe"
		/>
		<div v-else :class="$style.emptyState" data-test-id="app-preview-empty">
			<N8nText color="text-light">{{ i18n.baseText('instanceAi.appPreview.notBuiltYet') }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.frame {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background: var(--background--surface);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.iframe {
	flex: 1;
	width: 100%;
	border: 0;
}

.emptyState {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
