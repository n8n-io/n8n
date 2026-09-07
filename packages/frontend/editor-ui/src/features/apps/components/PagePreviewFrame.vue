<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		pageUrl: string;
		/** CSS width of the document; `390px` mimics a phone. */
		width?: string;
	}>(),
	{ width: '100%' },
);

const i18n = useI18n();

const refreshCount = ref(0);

// `r` busts the browser cache on every manual refresh.
const iframeSrc = computed(() =>
	refreshCount.value > 0 ? `${props.pageUrl}?r=${refreshCount.value}` : props.pageUrl,
);

function refresh() {
	refreshCount.value++;
}

defineExpose({ refresh });
</script>

<template>
	<div :class="$style.frame" data-test-id="page-preview-frame">
		<!-- The served document is CSP-sandboxed by the backend, so the iframe needs no sandbox attribute. -->
		<iframe
			:src="iframeSrc"
			:title="i18n.baseText('apps.page.preview.title')"
			:class="$style.iframe"
			:style="{ width: props.width }"
			data-test-id="page-preview-iframe"
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
