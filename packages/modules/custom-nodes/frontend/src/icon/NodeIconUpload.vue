<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { escapeXmlText } from '@n8n/utils/string/escape-xml';

import { useCustomNodesStore } from '../custom-nodes.store';

const MAX_ICON_BYTES = 256 * 1024;

const props = defineProps<{ nodeId: string }>();

const emit = defineEmits<{ uploaded: [] }>();

const i18n = useI18n();
const toast = useToast();
const store = useCustomNodesStore();

const input = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

function readAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read'));
		reader.onerror = () => reject(new Error('read'));
		reader.readAsDataURL(file);
	});
}

function serverStatus(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'httpStatusCode' in error) {
		const status = error.httpStatusCode;
		return typeof status === 'number' ? status : undefined;
	}
	return undefined;
}

async function onChange(event: Event) {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	const file = target.files?.[0];
	target.value = '';
	if (!file) return;

	if (file.size > MAX_ICON_BYTES) {
		toast.showMessage({
			title: i18n.baseText('customNodes.icon.tooLarge'),
			type: 'error',
		});
		return;
	}

	uploading.value = true;
	try {
		const iconDataUri = await readAsDataUri(file);
		await store.setNodeIcon(props.nodeId, { iconDataUri });
		emit('uploaded');
		toast.showMessage({ title: i18n.baseText('customNodes.icon.success'), type: 'success' });
	} catch (error) {
		if (serverStatus(error) === 400) {
			// The toast renders HTML, so escape the reason: it can name an element such as <script>.
			const reason = escapeXmlText(error instanceof Error ? error.message : '');
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
