<script setup lang="ts">
import type { ScimTransferTarget } from '@n8n/api-types';
import { N8nButton, N8nDialog, N8nDialogFooter, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import ScimTransferTargetPicker from './ScimTransferTargetPicker.vue';
import type { ScimTransferPick } from '../scim.types';

/**
 * Picks who receives the work of a user that SCIM deletes. Opens from the
 * pencil on the "Transfer resources to" row, or when the data action switches
 * from Delete to Transfer. Save is enabled only for a new pick.
 */
const props = defineProps<{
	open: boolean;
	/** The stored target. The picker starts on it. Null starts the picker empty. */
	current: ScimTransferTarget | null;
	saving?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	save: [pick: ScimTransferPick, searchUsed: boolean];
	cancel: [];
}>();

const i18n = useI18n();

const pick = ref<ScimTransferPick | null>(null);
const searchUsed = ref(false);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		pick.value = null;
		searchUsed.value = false;
	},
);

const canSave = computed(
	() => pick.value !== null && pick.value.projectId !== props.current?.projectId,
);

function onCancel() {
	emit('cancel');
	emit('update:open', false);
}

function onSave() {
	if (!pick.value || !canSave.value) return;
	emit('save', pick.value, searchUsed.value);
}
</script>

<template>
	<N8nDialog
		:open="props.open"
		size="medium"
		:header="i18n.baseText('settings.scim.transferDialog.title')"
		:description="i18n.baseText('settings.scim.transferDialog.description')"
		data-test-id="scim-transfer-dialog"
		@update:open="(value) => (value ? emit('update:open', true) : onCancel())"
	>
		<N8nInputLabel :label="i18n.baseText('settings.scim.transferDialog.label')" size="small">
			<ScimTransferTargetPicker
				v-if="props.open"
				:model-value="pick?.projectId ?? props.current?.projectId ?? null"
				:initial-target="props.current"
				auto-focus
				@update:model-value="pick = $event"
				@search-used="searchUsed = true"
			/>
		</N8nInputLabel>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="scim-transfer-cancel"
				@click="onCancel"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('generic.save')"
				:disabled="!canSave"
				:loading="props.saving"
				data-test-id="scim-transfer-save"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
