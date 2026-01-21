<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nInput } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeCategory } from '../nodeGovernance.api';

const props = defineProps<{
	show: boolean;
	category: NodeCategory | null;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { showError, showMessage } = useToast();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const loading = ref(false);

const slug = ref('');
const displayName = ref('');
const description = ref('');
const color = ref('#4A90D9');

const isEdit = computed(() => props.category !== null);
const modalTitle = computed(() =>
	isEdit.value
		? i18n.baseText('nodeGovernance.categories.edit.title')
		: i18n.baseText('nodeGovernance.categories.create.title'),
);

watch(
	() => props.show,
	(newValue) => {
		if (newValue && props.category) {
			slug.value = props.category.slug;
			displayName.value = props.category.displayName;
			description.value = props.category.description ?? '';
			color.value = props.category.color ?? '#4A90D9';
		} else if (newValue) {
			resetForm();
		}
	},
);

function resetForm() {
	slug.value = '';
	displayName.value = '';
	description.value = '';
	color.value = '#4A90D9';
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

function onDisplayNameChange(value: string) {
	displayName.value = value;
	if (!isEdit.value) {
		slug.value = generateSlug(value);
	}
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
		if (isEdit.value && props.category) {
			await nodeGovernanceStore.updateCategory(props.category.id, {
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
		emit('close');
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

function onClose() {
	emit('close');
}
</script>

<template>
	<Modal
		:name="'category-form-modal'"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		:model-value="show"
		width="500px"
		@update:model-value="onClose"
	>
		<template #content>
			<div :class="$style.form">
				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.categories.form.displayName') }}
					</label>
					<N8nInput
						:model-value="displayName"
						:class="$style.input"
						placeholder="e.g., External APIs"
						@update:model-value="onDisplayNameChange"
					/>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.categories.form.slug') }}
					</label>
					<N8nInput
						v-model="slug"
						:class="$style.input"
						placeholder="e.g., external-apis"
					/>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.categories.form.description') }}
					</label>
					<N8nInput
						v-model="description"
						:class="$style.input"
						type="textarea"
						:rows="3"
						placeholder="Optional description"
					/>
				</div>

				<div :class="$style.field">
					<label :class="$style.label">
						{{ i18n.baseText('nodeGovernance.categories.form.color') }}
					</label>
					<div :class="$style.colorRow">
						<input
							v-model="color"
							type="color"
							:class="$style.colorPicker"
						/>
						<N8nInput
							v-model="color"
							:class="$style.colorInput"
							placeholder="#4A90D9"
						/>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" :disabled="loading" @click="onClose">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :loading="loading" @click="onSubmit">
					{{ isEdit ? i18n.baseText('generic.save') : i18n.baseText('generic.create') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
}

.input {
	width: 100%;
}

.colorRow {
	display: flex;
	gap: var(--spacing-xs);
	align-items: center;
}

.colorPicker {
	width: 40px;
	height: 40px;
	border: none;
	border-radius: var(--border-radius-base);
	cursor: pointer;
}

.colorInput {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
}
</style>
