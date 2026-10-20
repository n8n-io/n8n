<script lang="ts" setup>
import { computed } from 'vue';
import { N8nDialog, N8nDialogBody, N8nDialogHeader, N8nDialogTitle } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import ComputerUseSetupContent from './ComputerUseSetupContent.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ modalName: string }>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

async function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nDialog :open="modalOpen" size="large" @update:open="onDialogOpenUpdate">
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('instanceAi.welcomeModal.gateway.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<ComputerUseSetupContent />
		</N8nDialogBody>
	</N8nDialog>
</template>
