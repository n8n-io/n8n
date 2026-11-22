<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useCustomNodesStore } from '../custom-nodes.store';
import { escapedIconReason, readIconFile, serverStatus } from './iconFile';

const props = defineProps<{ nodeId: string }>();

const emit = defineEmits<{ uploaded: [] }>();

const i18n = useI18n();
const toast = useToast();
const store = useCustomNodesStore();

const REJECTIONS = {
	tooLarge: 'customNodes.icon.tooLarge',
	wrongType: 'customNodes.icon.wrongType',
	unreadable: 'customNodes.icon.error',
} as const;

const input = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

async function onChange(event: Event) {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	const file = target.files?.[0];
	target.value = '';
	if (!file) return;

	const result = await readIconFile(file);
	if (!result.ok) {
		toast.showMessage({
			title: i18n.baseText(REJECTIONS[result.reason]),
			type: 'error',
		});
		return;
	}

	uploading.value = true;
	try {
		await store.setNodeIcon(props.nodeId, { iconDataUri: result.dataUri });
		emit('uploaded');
		toast.showMessage({ title: i18n.baseText('customNodes.icon.success'), type: 'success' });
	} catch (error) {
		if (serverStatus(error) === 400) {
			const reason = escapedIconReason(error);
			toast.showMessage({
				title: i18n.baseText('customNodes.icon.error'),
				message: `${reason} ${i18n.baseText('customNodes.icon.svgHint')}`.trim(),
				type: 'error',
			});
		} else {
			toast.showError(error, i18n.baseText('customNodes.icon.error'));
		}
	} finally {
		uploading.value = false;
	}
}
</script>

<template>
	<span>
		<input
			ref="input"
			type="file"
			accept="image/png,image/svg+xml"
			hidden
			data-test-id="custom-nodes-icon-input"
			@change="onChange"
		/>
		<N8nButton
			variant="ghost"
			icon="image"
			:loading="uploading"
			:label="i18n.baseText('customNodes.icon.upload')"
			data-test-id="custom-nodes-icon-upload"
			@click="input?.click()"
		/>
	</span>
</template>
