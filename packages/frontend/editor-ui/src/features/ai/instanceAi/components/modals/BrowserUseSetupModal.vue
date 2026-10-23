<script lang="ts" setup>
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import BrowserUseSetupContent from './BrowserUseSetupContent.vue';

const props = defineProps<{ modalName: string }>();

const modalBus = createEventBus();
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="true"
		:event-bus="modalBus"
		custom-class="instance-ai-browser-use-setup-modal"
		width="540"
	>
		<template #content>
			<BrowserUseSetupContent auto-connect @close="modalBus.emit('close')" />
		</template>
	</Modal>
</template>

<style lang="scss">
.instance-ai-browser-use-setup-modal {
	.el-dialog__header {
		padding: 0;
		margin: 0;
	}
	.el-dialog__body {
		padding: 0;
	}
}
</style>
