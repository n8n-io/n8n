<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { N8nButton, N8nCallout, N8nInput, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@n8n/composables/useToast';
import { useFilesStore } from '@/features/core/files/files.store';
import type { ProjectFile } from '@/features/core/files/files.types';
import { useDependencies } from '@/app/composables/useDependencies';

type Props = {
	modalName: string;
	file: ProjectFile;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const toast = useToast();
const filesStore = useFilesStore();
const { getTotalCount } = useDependencies();

const newName = ref(props.file.name);
const nameError = ref('');
const saving = ref(false);

const usedByCount = computed(() => getTotalCount(props.file.id));

const canSubmit = computed(
	() => newName.value.trim() !== '' && newName.value.trim() !== props.file.name && !saving.value,
);

const onConfirm = async () => {
	const name = newName.value.trim();
	if (!name || name === props.file.name) return;

	saving.value = true;
	nameError.value = '';
	try {
		const exists = await filesStore.fileNameExists(props.file.projectId, name);
		if (exists) {
			nameError.value = i18n.baseText('files.rename.nameExists', {
				interpolate: { name },
			});
			return;
		}
		await filesStore.renameFile(props.file.id, props.file.projectId, name);
		emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('files.rename.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('files.rename.title')"
		:center="true"
		width="460px"
		:event-bus="undefined"
		data-test-id="rename-file-modal"
		@enter="onConfirm"
	>
		<template #content>
			<div :class="$style.content">
				<N8nInput
					v-model="newName"
					:placeholder="i18n.baseText('files.rename.placeholder')"
					data-test-id="rename-file-input"
					@input="nameError = ''"
				/>
				<N8nText v-if="nameError" size="small" color="danger" data-test-id="rename-file-error">
					{{ nameError }}
				</N8nText>
				<N8nCallout theme="warning" :class="$style.warning">
					{{ i18n.baseText('files.rename.warning') }}
					<template v-if="usedByCount > 0">
						{{
							i18n.baseText('files.usedBy.count', {
								adjustToNumber: usedByCount,
								interpolate: { count: String(usedByCount) },
							})
						}}
					</template>
				</N8nCallout>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="rename-file-cancel"
					@click="() => emit('close')"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('generic.rename')"
					:disabled="!canSubmit"
					:loading="saving"
					data-test-id="rename-file-confirm"
					@click="onConfirm"
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

.warning {
	margin-top: var(--spacing--3xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
