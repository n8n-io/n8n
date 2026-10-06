<script setup lang="ts">
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import type { EventBus } from '@n8n/utils/event-bus';

import type { ModalKey } from '@/Interface';

import EventDestinationSettingsModal from './EventDestinationSettingsModal.vue';

// The modal registry passes the modal state as one `data` prop.
// The modal takes these values as separate props.
defineProps<{
	modalName: ModalKey;
	data?: {
		destination?: MessageEventBusDestinationOptions;
		isNew?: boolean;
		eventBus?: EventBus;
	};
}>();
</script>

<template>
	<EventDestinationSettingsModal
		:modal-name="modalName"
		:destination="data?.destination"
		:is-new="data?.isNew"
		:event-bus="data?.eventBus"
	/>
</template>
