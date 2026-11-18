<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { N8nButton, N8nDialog, N8nDialogBody } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { studioCopy } from './copy';

// Load the art renderer only when the studio opens.
const PrintStudio = defineAsyncComponent(async () => await import('./PrintStudio.vue'));
defineProps<{ workflow: unknown }>();
const i18n = useI18n();
const copy = studioCopy((key) => i18n.baseText(key));
const open = ref(false);
const demo = new URLSearchParams(window.location.search).get('hackmation') === 'prints';
function onShortcut(event: KeyboardEvent) {
	const target = event.target;
	if (
		target instanceof HTMLElement &&
		(target.isContentEditable || target.closest('input, textarea, select, [role="dialog"]'))
	)
		return;
	if (event.altKey && event.shiftKey && event.code === 'KeyP' && !event.repeat) {
		event.preventDefault();
		open.value = true;
	}
}
onMounted(() => window.addEventListener('keydown', onShortcut));
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut));
</script>

<template>
	<div>
		<N8nButton
			v-if="demo"
			variant="outline"
			size="small"
			data-testid="open-print-studio"
			@click="open = true"
			>{{ copy.open }}</N8nButton
		>
		<N8nDialog v-model:open="open" size="2xlarge" :aria-label="copy.title" :header="copy.title">
			<N8nDialogBody>
				<PrintStudio v-if="open" :workflow="workflow" :copy="copy" />
			</N8nDialogBody>
		</N8nDialog>
	</div>
</template>
