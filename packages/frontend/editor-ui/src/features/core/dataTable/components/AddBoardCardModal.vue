<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';

import { N8nButton, N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';

type CardModalData = {
	initialStatus?: string;
	card?: DataTableRow;
};

type Props = {
	modalName: string;
	dataTableId: string;
	projectId: string;
	allowedStatuses: string[];
};

const props = defineProps<Props>();

const emit = defineEmits<{
	created: [row: DataTableRow];
	updated: [row: DataTableRow];
	deleted: [rowId: number];
	toggleSave: [value: boolean];
}>();

const dataTableStore = useDataTableStore();
const uiStore = useUIStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();

type TitleInputRef = ComponentPublicInstance & {
	focus: () => void;
	select: () => void;
};

const cardTitle = ref('');
const cardDescription = ref('');
const selectedStatus = ref('');
const editingRowId = ref<number | null>(null);
const titleInputRef = ref<TitleInputRef | null>(null);
const isLoading = ref(false);

const isModalOpen = computed(() => uiStore.modalsById[props.modalName]?.open);

const modalData = computed(
	() => uiStore.modalsById[props.modalName]?.data as CardModalData | undefined,
);

const isEditMode = computed(() => modalData.value?.card !== undefined);

const modalInitialStatus = computed(
	() => modalData.value?.initialStatus ?? props.allowedStatuses[0] ?? '',
);

const isSubmitDisabled = computed(
	() => !cardTitle.value.trim() || !selectedStatus.value || props.allowedStatuses.length === 0,
);

const reset = () => {
	cardTitle.value = '';
	cardDescription.value = '';
	selectedStatus.value = '';
	editingRowId.value = null;
};

const focusTitleInput = async () => {
	await nextTick();
	setTimeout(() => {
		titleInputRef.value?.focus();
		if (isEditMode.value) {
			titleInputRef.value?.select();
		}
	}, 0);
};

watch(isModalOpen, async (open) => {
	if (!open) {
		reset();
		return;
	}

	const card = modalData.value?.card;
	if (card) {
		const rowId = Number(card.id);
		editingRowId.value = Number.isNaN(rowId) ? null : rowId;
		cardTitle.value = String(card.name ?? '');
		cardDescription.value = String(card.description ?? '');
		selectedStatus.value = String(card.status ?? modalInitialStatus.value);
	} else {
		selectedStatus.value = modalInitialStatus.value;
	}

	await focusTitleInput();
});

const onClose = () => {
	uiStore.closeModal(props.modalName);
};

const onDelete = async () => {
	if (editingRowId.value === null || isLoading.value) {
		return;
	}

	const title = cardTitle.value.trim() || i18n.baseText('board.kanban.untitledCard');
	const confirmResponse = await message.confirm(
		i18n.baseText('board.kanban.deleteCard.confirmation', {
			interpolate: { name: title },
		}),
		i18n.baseText('board.kanban.deleteCard.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmResponse !== MODAL_CONFIRM) {
		return;
	}

	isLoading.value = true;
	emit('toggleSave', true);
	try {
		await dataTableStore.deleteRows(props.dataTableId, props.projectId, [editingRowId.value]);
		emit('deleted', editingRowId.value);
		onClose();
	} catch (error) {
		toast.showError(error, i18n.baseText('board.kanban.deleteCard.error'));
	} finally {
		isLoading.value = false;
		emit('toggleSave', false);
	}
};

const onSubmit = async () => {
	if (isSubmitDisabled.value || isLoading.value) {
		return;
	}

	const rowData = {
		status: selectedStatus.value,
		name: cardTitle.value.trim(),
		description: cardDescription.value.trim(),
	};

	isLoading.value = true;
	emit('toggleSave', true);
	try {
		if (editingRowId.value !== null) {
			await dataTableStore.updateRow(
				props.dataTableId,
				props.projectId,
				editingRowId.value,
				rowData,
			);
			emit('updated', {
				...modalData.value?.card,
				id: editingRowId.value,
				...rowData,
			});
			onClose();
			return;
		}

		const inserted = await dataTableStore.insertDataTableRow(
			props.dataTableId,
			props.projectId,
			rowData,
		);

		if (inserted) {
			emit('created', inserted);
			onClose();
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText(isEditMode.value ? 'board.kanban.updateError' : 'board.kanban.addError'),
		);
	} finally {
		isLoading.value = false;
		emit('toggleSave', false);
	}
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="540px">
		<template #header>
			<div :class="$style.header">
				<h2>
					{{
						i18n.baseText(isEditMode ? 'board.kanban.editCard.title' : 'board.kanban.addCard.title')
					}}
				</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInputLabel
					:label="i18n.baseText('board.kanban.addCard.input.title.label')"
					:required="true"
					input-name="cardTitle"
				>
					<N8nInput
						ref="titleInputRef"
						v-model="cardTitle"
						type="text"
						:placeholder="i18n.baseText('board.kanban.addCard.input.title.placeholder')"
						data-test-id="board-card-title-input"
						name="cardTitle"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('board.kanban.addCard.input.description.label')"
					input-name="cardDescription"
				>
					<N8nInput
						v-model="cardDescription"
						type="textarea"
						:rows="4"
						:placeholder="i18n.baseText('board.kanban.addCard.input.description.placeholder')"
						data-test-id="board-card-description-input"
						name="cardDescription"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('board.kanban.addCard.input.status.label')"
					:required="true"
					input-name="cardStatus"
				>
					<N8nSelect
						v-model="selectedStatus"
						data-test-id="board-card-status-select"
						name="cardStatus"
					>
						<N8nOption
							v-for="status in props.allowedStatuses"
							:key="status"
							:label="status"
							:value="status"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditMode"
					variant="destructive"
					size="large"
					:loading="isLoading"
					:label="i18n.baseText('generic.delete')"
					data-test-id="delete-board-card-button"
					@click="onDelete"
				/>
				<div :class="$style.footerActions">
					<N8nButton
						variant="subtle"
						size="large"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="cancel-add-board-card-button"
						@click="onClose"
					/>
					<N8nButton
						:loading="isLoading"
						size="large"
						:disabled="isSubmitDisabled"
						:label="i18n.baseText(isEditMode ? 'generic.save' : 'generic.create')"
						data-test-id="confirm-add-board-card-button"
						@click="onSubmit"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.header {
	margin-bottom: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--lg);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	margin-left: auto;
}
</style>
