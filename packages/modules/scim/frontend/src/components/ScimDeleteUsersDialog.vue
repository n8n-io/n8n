<script setup lang="ts">
import type { ScimDataAction } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nRadioGroup,
	N8nRadioGroupItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import ScimTransferTargetPicker from './ScimTransferTargetPicker.vue';
import type { ScimTransferPick } from '../scim.types';

/**
 * Opens when the admin switches "When a user is deleted" from Disable user to
 * Delete user. The admin decides what happens to the work before the first
 * deletion runs without them.
 */
const props = defineProps<{
	open: boolean;
	saving?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	save: [
		choice: { dataAction: ScimDataAction; pick: ScimTransferPick | null; searchUsed: boolean },
	];
	cancel: [];
}>();

const i18n = useI18n();

const dataAction = ref<ScimDataAction>('transfer');
const pick = ref<ScimTransferPick | null>(null);
const searchUsed = ref(false);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		dataAction.value = 'transfer';
		pick.value = null;
		searchUsed.value = false;
	},
);

const canSave = computed(() => dataAction.value === 'delete' || pick.value !== null);

function onCancel() {
	emit('cancel');
	emit('update:open', false);
}

function onSave() {
	if (!canSave.value) return;
	emit('save', {
		dataAction: dataAction.value,
		pick: dataAction.value === 'transfer' ? pick.value : null,
		searchUsed: searchUsed.value,
	});
}

function onRadioChange(value: string | number | boolean | undefined) {
	if (value === 'transfer' || value === 'delete') dataAction.value = value;
}
</script>

<template>
	<N8nDialog
		:open="props.open"
		size="medium"
		:header="i18n.baseText('settings.scim.deleteUsersDialog.title')"
		:description="i18n.baseText('settings.scim.deleteUsersDialog.description')"
		data-test-id="scim-delete-users-dialog"
		@update:open="(value) => (value ? emit('update:open', true) : onCancel())"
	>
		<N8nRadioGroup
			:model-value="dataAction"
			orientation="vertical"
			:aria-label="i18n.baseText('settings.scim.deleteUsersDialog.label')"
			:class="$style.options"
			data-test-id="scim-delete-users-data-action"
			@update:model-value="onRadioChange"
		>
			<div :class="$style.option">
				<N8nRadioGroupItem
					value="transfer"
					:label="i18n.baseText('settings.scim.deleteUsersDialog.transfer')"
					:description="i18n.baseText('settings.scim.deleteUsersDialog.transfer.description')"
					data-test-id="scim-delete-users-transfer"
				/>
				<div v-if="dataAction === 'transfer'" :class="$style.picker">
					<ScimTransferTargetPicker
						v-if="props.open"
						:model-value="pick?.projectId ?? null"
						@update:model-value="pick = $event"
						@search-used="searchUsed = true"
					/>
				</div>
			</div>
			<div :class="$style.option">
				<N8nRadioGroupItem
					value="delete"
					:label="i18n.baseText('settings.scim.deleteUsersDialog.delete')"
					:description="i18n.baseText('settings.scim.deleteUsersDialog.delete.description')"
					data-test-id="scim-delete-users-delete"
				/>
			</div>
		</N8nRadioGroup>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="scim-delete-users-cancel"
				@click="onCancel"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('generic.save')"
				:disabled="!canSave"
				:loading="props.saving"
				data-test-id="scim-delete-users-save"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

// Lines the picker up with the radio label, past the radio control.
.picker {
	padding-left: var(--spacing--lg);
}
</style>
