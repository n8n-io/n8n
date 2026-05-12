<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';

const documentTitle = useDocumentTitle();
const locale = useI18n();

onMounted(async () => {
	documentTitle.set(locale.baseText('agents.heading'));
});
</script>

<template>
	<div :class="$style.agentView">
		<RouterView />
	</div>
</template>

<style module>
.agentView {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	min-height: 0;
}
</style>
