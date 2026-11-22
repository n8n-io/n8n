<script setup lang="ts">
import { N8nDialog } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import CustomActionWizard from './CustomActionWizard.vue';
import type { CustomActionWizardData } from './wizard.types';

/**
 * The wizard for custom nodes and custom actions. The parent owns the open state, like the
 * connect dialogs of the MCP module: a module cannot close a modal of the shell's modal store.
 */
const props = withDefaults(defineProps<{ data?: CustomActionWizardData }>(), {
	data: () => ({ mode: 'create' }),
});

const emit = defineEmits<{ saved: [] }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();

const busy = ref(false);

const title = computed(() =>
	props.data.mode === 'edit'
		? i18n.baseText('customNodes.wizard.title.edit')
		: i18n.baseText('customNodes.wizard.title.create'),
);

function close() {
	open.value = false;
}

function onOpenChange(value: boolean) {
	if (!value && !busy.value) close();
}

function onSaved() {
	emit('saved');
	close();
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="xlarge"
		:header="title"
		:close-on-overlay-click="false"
		data-test-id="custom-action-wizard"
		@update:open="onOpenChange"
	>
		<CustomActionWizard
			v-if="open"
			:data="data"
			@close="close"
			@saved="onSaved"
			@busy="busy = $event"
		/>
	</N8nDialog>
</template>
