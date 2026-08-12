<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useFilesStore } from '@/features/core/files/files.store';
import type { FileConflictResolution } from '@/features/core/files/files.types';

type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const filesStore = useFilesStore();

const applyToAll = ref(false);

const currentConflict = computed(() => filesStore.conflictedUploads[0]);
const conflictCount = computed(() => filesStore.conflictedUploads.length);

watch(conflictCount, (count) => {
	if (count === 0) {
		applyToAll.value = false;
	}
});

const resolve = (resolution: FileConflictResolution) => {
	if (!currentConflict.value) return;
	filesStore.resolveConflict(currentConflict.value.id, resolution, applyToAll.value);
	if (filesStore.conflictedUploads.length === 0) {
		emit('close');
	}
};
</script>

<template>
	<Modal
		v-if="currentConflict"
		:name="props.modalName"
		:title="
			i18n.baseText('files.upload.conflict.title', {
				interpolate: { name: currentConflict.name },
			})
		"
		:center="true"
		width="460px"
		:event-bus="undefined"
		:close-on-click-modal="false"
		data-test-id="upload-conflict-modal"
	>
		<template #content>
			<div :class="$style.content">
				<N8nText tag="p">
					{{
						i18n.baseText('files.upload.conflict.description', {
							interpolate: { name: currentConflict.name },
						})
					}}
				</N8nText>
				<N8nCheckbox
					v-if="conflictCount > 1"
					v-model="applyToAll"
					:label="
						i18n.baseText('files.upload.conflict.applyToAll', {
							interpolate: { count: String(conflictCount) },
						})
					"
					data-test-id="upload-conflict-apply-all"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="upload-conflict-cancel"
					@click="resolve('cancel')"
				/>
				<N8nButton
					size="large"
					variant="outline"
					:label="i18n.baseText('files.upload.conflict.keepBoth')"
					data-test-id="upload-conflict-keep-both"
					@click="resolve('keepBoth')"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('files.upload.conflict.replace')"
					data-test-id="upload-conflict-replace"
					@click="resolve('replace')"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
