<script lang="ts" setup>
import { computed } from 'vue';
import { N8nDialog, N8nDialogBody } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import ComputerUseSetupContent from './ComputerUseSetupContent.vue';

const props = defineProps<{ modalName: string }>();

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
	<N8nDialog
		:open="modalOpen"
		size="large"
		container-class="instance-ai-computer-use-setup-modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<ComputerUseSetupContent />
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss">
.instance-ai-computer-use-setup-modal {
	padding: 0;
	--n8n-dialog-content--padding: 0;
}
</style>
