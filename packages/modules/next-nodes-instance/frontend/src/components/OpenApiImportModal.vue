<script setup lang="ts">
import type { NextNodeOpenApiImport } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import { useNextNodesInstanceStore } from '../next-nodes-instance.store';

const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ done: [] }>();

const i18n = useI18n();
const toast = useToast();
const store = useNextNodesInstanceStore();

const document = ref('');
const importing = ref(false);
const imported = ref<NextNodeOpenApiImport>();
const fileInput = ref<HTMLInputElement>();

watch(open, (isOpen) => {
	if (!isOpen) return;
	document.value = '';
	imported.value = undefined;
});

async function readFile(event: Event) {
	const file = event.target instanceof HTMLInputElement ? event.target.files?.[0] : undefined;
	if (file) document.value = await file.text();
}

async function runImport() {
	importing.value = true;
	try {
		imported.value = await store.importOpenApi(document.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.openApi.error'));
	} finally {
		importing.value = false;
	}
}

function finish() {
	open.value = false;
	emit('done');
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('settings.nodes.openApi.title')"
		:description="i18n.baseText('settings.nodes.openApi.description')"
		size="large"
		data-test-id="openapi-import-modal"
	>
		<div v-if="!imported" :class="$style.body">
			<N8nInput
				v-model="document"
				type="textarea"
				:rows="14"
				:placeholder="i18n.baseText('settings.nodes.openApi.placeholder')"
				:class="$style.document"
				data-test-id="openapi-import-document"
			/>
			<input
				ref="fileInput"
				type="file"
				accept=".json,.yaml,.yml,application/json,application/yaml"
				:class="$style.file"
				data-test-id="openapi-import-file"
				@change="readFile"
			/>
		</div>

		<div v-else :class="$style.body" data-test-id="openapi-import-result">
			<N8nText tag="p" size="medium" color="text-dark">
				{{
					i18n.baseText('settings.nodes.openApi.published', {
						adjustToNumber: imported.published.length,
						interpolate: {
							count: String(imported.published.length),
							node: imported.node.displayName,
						},
					})
				}}
			</N8nText>
			<ul v-if="imported.published.length" :class="$style.list">
				<li v-for="action in imported.published" :key="action.actionId">
					<N8nIcon icon="check" color="success" size="small" />
					<N8nText size="small">{{ action.action }}</N8nText>
					<N8nText size="small" color="text-light">{{ action.actionId }}</N8nText>
				</li>
			</ul>
			<N8nCallout v-if="imported.credential" theme="info" data-test-id="openapi-import-credential">
				{{
					imported.credential.header
						? i18n.baseText('settings.nodes.openApi.credential.header', {
								interpolate: { header: imported.credential.header },
							})
						: i18n.baseText('settings.nodes.openApi.credential.bearer')
				}}
			</N8nCallout>
			<template v-if="imported.skipped.length">
				<N8nText tag="p" size="medium" color="text-dark">
					{{
						i18n.baseText('settings.nodes.openApi.skipped', {
							adjustToNumber: imported.skipped.length,
							interpolate: { count: String(imported.skipped.length) },
						})
					}}
				</N8nText>
				<ul :class="$style.list" data-test-id="openapi-import-skipped">
					<li v-for="skip in imported.skipped" :key="skip.operation">
						<N8nIcon icon="circle-minus" color="text-light" size="small" />
						<N8nText size="small" :class="$style.operation">{{ skip.operation }}</N8nText>
						<N8nText size="small" color="text-light">{{ skip.reason }}</N8nText>
					</li>
				</ul>
			</template>
		</div>

		<N8nDialogFooter>
			<template v-if="!imported">
				<N8nButton variant="outline" @click="fileInput?.click()">
					<template #icon><N8nIcon icon="upload" /></template>
					{{ i18n.baseText('settings.nodes.openApi.upload') }}
				</N8nButton>
				<N8nButton
					:disabled="!document.trim()"
					:loading="importing"
					data-test-id="openapi-import-submit"
					@click="runImport"
				>
					{{ i18n.baseText('settings.nodes.openApi.import') }}
				</N8nButton>
			</template>
			<N8nButton v-else data-test-id="openapi-import-done" @click="finish">
				{{ i18n.baseText('settings.nodes.openApi.done') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.document textarea {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.file {
	display: none;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: baseline;
		gap: var(--spacing--2xs);
	}
}

.operation {
	font-family: var(--font-family--monospace);
	white-space: nowrap;
}
</style>
