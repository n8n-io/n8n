<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useToast } from '@n8n/composables/useToast';
import { useFilesStore } from '@/features/core/files/files.store';
import type { ProjectFile } from '@/features/core/files/files.types';
import { useDependencies } from '@/app/composables/useDependencies';
import { getShortMimeLabel } from '@/features/core/files/utils/mimeUtils';
import { formatBytes } from '@/app/utils/typesUtils';

type Props = {
	modalName: string;
	file: ProjectFile;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	close: [];
	replaced: [];
}>();

const i18n = useI18n();
const toast = useToast();
const filesStore = useFilesStore();
const { getTotalCount } = useDependencies();

const fileInputRef = ref<HTMLInputElement | null>(null);
const pickedFile = ref<File | null>(null);
const saving = ref(false);

const usedByCount = computed(() => getTotalCount(props.file.id));

const currentSummary = computed(
	() => `${formatBytes(props.file.sizeBytes)} · ${getShortMimeLabel(props.file.mimeType)}`,
);

const pickedSummary = computed(() => {
	if (!pickedFile.value) return '';
	const mimeType = pickedFile.value.type || 'application/octet-stream';
	return `${formatBytes(pickedFile.value.size)} · ${getShortMimeLabel(mimeType)}`;
});

const onPickFile = () => {
	fileInputRef.value?.click();
};

const onFilePicked = (event: Event) => {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	pickedFile.value = target.files?.[0] ?? null;
	// Allow re-picking the same file
	target.value = '';
};

const onDownloadCurrent = () => {
	filesStore.downloadFile(props.file);
};

const onConfirm = async () => {
	if (!pickedFile.value) return;
	saving.value = true;
	try {
		await filesStore.replaceFile(props.file.id, props.file.projectId, pickedFile.value);
		toast.showMessage({
			title: i18n.baseText('files.toast.saved'),
			type: 'success',
		});
		emit('replaced');
		emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('files.replace.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('files.replace.title', { interpolate: { name: props.file.name } })"
		:center="true"
		width="520px"
		:event-bus="undefined"
		data-test-id="replace-file-modal"
	>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.comparison">
					<div :class="$style.version" data-test-id="replace-file-current">
						<N8nText size="small" color="text-light" tag="div">
							{{ i18n.baseText('files.replace.current') }}
						</N8nText>
						<N8nText bold tag="div">{{ currentSummary }}</N8nText>
						<N8nText size="small" color="text-light" tag="div">
							{{ i18n.baseText('workerList.item.lastUpdated') }}
							<TimeAgo :date="String(props.file.updatedAt)" />
						</N8nText>
					</div>
					<N8nIcon icon="arrow-right" :class="$style.arrow" />
					<div :class="$style.version" data-test-id="replace-file-new">
						<N8nText size="small" color="text-light" tag="div">
							{{ i18n.baseText('files.replace.new') }}
						</N8nText>
						<template v-if="pickedFile">
							<N8nText bold tag="div">{{ pickedSummary }}</N8nText>
							<N8nText size="small" color="text-light" tag="div">{{ pickedFile.name }}</N8nText>
						</template>
						<N8nButton
							v-else
							variant="subtle"
							:label="i18n.baseText('files.replace.chooseFile')"
							data-test-id="replace-file-picker"
							@click="onPickFile"
						/>
					</div>
				</div>
				<N8nText v-if="usedByCount > 0" size="small" color="text-light" tag="div">
					{{
						i18n.baseText('files.usedBy.count', {
							adjustToNumber: usedByCount,
							interpolate: { count: String(usedByCount) },
						})
					}}
				</N8nText>
				<N8nText size="small" tag="div">
					{{ i18n.baseText('files.replace.description') }}
				</N8nText>
				<N8nLink
					size="small"
					data-test-id="replace-file-download-current"
					@click="onDownloadCurrent"
				>
					{{ i18n.baseText('files.replace.downloadCurrent') }}
				</N8nLink>
				<input
					ref="fileInputRef"
					type="file"
					:class="$style.hiddenInput"
					data-test-id="replace-file-input"
					@change="onFilePicked"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="pickedFile"
					variant="subtle"
					size="large"
					:label="i18n.baseText('files.replace.chooseDifferentFile')"
					data-test-id="replace-file-repick"
					@click="onPickFile"
				/>
				<div :class="$style.footerActions">
					<N8nButton
						size="large"
						variant="subtle"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="replace-file-cancel"
						@click="() => emit('close')"
					/>
					<N8nButton
						size="large"
						:label="i18n.baseText('files.replace.confirm')"
						:disabled="!pickedFile || saving"
						:loading="saving"
						data-test-id="replace-file-confirm"
						@click="onConfirm"
					/>
				</div>
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

.comparison {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.version {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.arrow {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.hiddenInput {
	display: none;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--xs);
	margin-left: auto;
}
</style>
