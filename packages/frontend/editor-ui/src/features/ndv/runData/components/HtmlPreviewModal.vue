<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import Modal from '@/app/components/Modal.vue';
import { HTML_PREVIEW_MODAL_KEY } from '@/app/constants';
import RunDataHtml from './RunDataHtml.vue';

const props = defineProps<{
	data: {
		html: string;
		title?: string;
	};
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();

const mode = ref<'preview' | 'raw'>('preview');

const modeOptions = computed(() => [
	{ label: i18n.baseText('runData.htmlPreview.preview'), value: 'preview' },
	{ label: i18n.baseText('runData.htmlPreview.raw'), value: 'raw' },
]);

async function copyHtml() {
	await clipboard.copy(props.data.html);
	toast.showMessage({ title: i18n.baseText('generic.copiedToClipboard'), type: 'success' });
}
</script>

<template>
	<Modal :name="HTML_PREVIEW_MODAL_KEY" width="70%" height="85%" :center="true">
		<template #header>
			<div :class="$style.header">
				<N8nText size="large" bold>{{
					data.title || i18n.baseText('runData.htmlPreview.title')
				}}</N8nText>
				<div :class="$style.actions">
					<N8nRadioButtons v-model="mode" size="small" :options="modeOptions" />
					<N8nButton
						variant="outline"
						size="small"
						icon="copy"
						:label="i18n.baseText('generic.copy')"
						@click="copyHtml"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<RunDataHtml v-if="mode === 'preview'" :input-html="data.html" />
				<pre v-else :class="$style.raw" data-test-id="html-preview-raw">{{ data.html }}</pre>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	height: 100%;
	overflow: hidden;
}

.raw {
	flex: 1;
	margin: 0;
	overflow: auto;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	color: var(--color--text);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
