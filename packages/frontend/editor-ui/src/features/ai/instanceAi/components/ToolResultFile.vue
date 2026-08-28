<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

defineProps<{
	data: string;
	mimeType: string;
}>();

const i18n = useI18n();
</script>

<template>
	<!-- An iframe, not an embed: an `object-src 'none'` CSP refuses embeds -->
	<iframe
		:src="`data:${mimeType};base64,${data}`"
		:class="$style.file"
		:title="i18n.baseText('binaryDataDisplay.filePreview')"
	/>
</template>

<style module>
.file {
	width: 100%;
	height: 480px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
}
</style>
