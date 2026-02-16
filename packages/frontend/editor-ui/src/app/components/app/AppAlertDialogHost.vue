<script setup lang="ts">
import { computed } from 'vue';
import { isVNode } from 'vue';
import { storeToRefs } from 'pinia';

import N8nAlertDialog from '@n8n/design-system/components/N8nAlertDialog/AlertDialog.vue';
import { useAlertDialogStore } from '@/app/stores/alertDialog.store';

const alertDialogStore = useAlertDialogStore();
const {
	isOpen,
	activeType,
	title,
	message,
	actionLabel,
	cancelLabel,
	actionVariant,
	showCancel,
	showCloseButton,
	disableOutsidePointerEvents,
	customClass,
} = storeToRefs(alertDialogStore);

const isActive = computed(() => isOpen.value && activeType.value === 'alert');
const isMessageVNode = computed(() => isVNode(message.value));
const messageComponent = computed(() =>
	isMessageVNode.value ? { render: () => message.value } : null,
);

const messageText = computed(() => (typeof message.value === 'string' ? message.value : ''));

const handleOpenChange = (value: boolean) => {
	alertDialogStore.updateOpen(value);
};
</script>

<template>
	<N8nAlertDialog
		:open="isActive"
		:title="title"
		:description="isMessageVNode ? undefined : messageText"
		:action-label="actionLabel"
		:cancel-label="cancelLabel"
		:action-variant="actionVariant"
		:show-cancel="showCancel"
		:show-close-button="showCloseButton"
		:disable-outside-pointer-events="disableOutsidePointerEvents"
		:content-class="customClass"
		@update:open="handleOpenChange"
		@action="alertDialogStore.confirm"
		@cancel="alertDialogStore.cancel"
	>
		<component v-if="isMessageVNode" :is="messageComponent" />
	</N8nAlertDialog>
</template>
