<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nInput } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { CATEGORY_FORM_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);

const slug = ref('');
const displayName = ref('');
const description = ref('');
const color = ref('#22C55E');

const modalState = computed(() => uiStore.modalsById[CATEGORY_FORM_MODAL_KEY]);
const isOpen = computed(() => modalState.value?.open ?? false);
const modalData = computed(() => modalState.value?.data ?? {});
const isEdit = computed(() => modalData.value.category !== undefined);
const modalTitle = computed(() => (isEdit.value ? 'Edit Category' : 'Create Category'));

// Watch when modal opens and populate form data
// Use immediate: true because the component is only mounted when the modal is already open
// (due to v-if in ModalRoot), so we need to run on mount, not just on changes
watch(
	isOpen,
	(nowOpen, wasOpen) => {
		if (nowOpen && !wasOpen) {
			// Modal just opened - populate form from data
			const category = modalData.value.category;
			if (category) {
				slug.value = category.slug ?? '';
				displayName.value = category.displayName ?? '';
				description.value = category.description ?? '';
				color.value = category.color ?? '#22C55E';
			} else {
				resetForm();
			}
		}
	},
	{ immediate: true },
);

function resetForm() {
	slug.value = '';
	displayName.value = '';
	description.value = '';
	color.value = '#22C55E';
}

async function onSubmit() {
	if (!slug.value.trim() || !displayName.value.trim()) {
		showError(
			new Error(i18n.baseText('nodeGovernance.categories.validation.required')),
			i18n.baseText('nodeGovernance.categories.validation.error'),
		);
		return;
	}

	loading.value = true;

	try {
		if (isEdit.value && modalData.value.category) {
			await nodeGovernanceStore.updateCategory(modalData.value.category.id, {
				slug: slug.value,
				displayName: displayName.value,
				description: description.value || null,
				color: color.value || null,
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.categories.update.success'),
				type: 'success',
			});
		} else {
			await nodeGovernanceStore.createCategory({
				slug: slug.value,
				displayName: displayName.value,
				description: description.value || undefined,
				color: color.value || undefined,
			});
			showMessage({
				title: i18n.baseText('nodeGovernance.categories.create.success'),
				type: 'success',
			});
		}
		closeModal();
	} catch (e) {
		showError(
			e,
			isEdit.value
				? i18n.baseText('nodeGovernance.categories.update.error')
				: i18n.baseText('nodeGovernance.categories.create.error'),
		);
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(CATEGORY_FORM_MODAL_KEY);
}
</script>

<template>
	<Modal
		:name="CATEGORY_FORM_MODAL_KEY"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		width="500px"
	>
		<template #content>
			<div :class="$style.form">
				<div :class="$style.field">
					<label :class="$style.label">Display Name</label>
					<N8nInput v-model="displayName" :class="$style.input" placeholder="e.g., External APIs" />
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Slug</label>
					<N8nInput v-model="slug" :class="$style.input" placeholder="e.g., external-api" />
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Description</label>
					<N8nInput
						v-model="description"
						:class="$style.input"
						type="textarea"
						:rows="3"
						placeholder="Optional description..."
					/>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">Color</label>
					<div :class="$style.colorField">
						<input v-model="color" type="color" :class="$style.colorPicker" />
						<N8nInput v-model="color" :class="$style.colorInput" placeholder="#22C55E" />
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="closeModal"> Cancel </N8nButton>
				<N8nButton :loading="loading" @click="onSubmit">
					{{ isEdit ? 'Save' : 'Create' }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.label {
	font-weight: 500;
	font-size: 13px;
	color: var(--color--text--shade-1);
}

.input {
	width: 100%;
}

.colorField {
	display: flex;
	gap: 10px;
	align-items: center;
}

.colorPicker {
	width: 44px;
	height: 36px;
	padding: 2px;
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	cursor: pointer;
	background: var(--color--background--light-2);

	&::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	&::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}
}

.colorInput {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
</style>
