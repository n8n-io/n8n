<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ComputerUseSetupContent from './ComputerUseSetupContent.vue';

const props = defineProps<{ modalName: string }>();

const pushConnectionStore = usePushConnectionStore();
const store = useInstanceAiSettingsStore();

onMounted(() => {
	pushConnectionStore.pushConnect();
	store.startGatewayPushListener();
	void store.fetchGatewayStatus();
});

onBeforeUnmount(() => {
	store.stopGatewayPushListener();
	pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="true"
		custom-class="instance-ai-computer-use-setup-modal"
		width="540"
	>
		<template #content>
			<ComputerUseSetupContent />
		</template>
	</Modal>
</template>

<style lang="scss">
.instance-ai-computer-use-setup-modal {
	.el-dialog__header {
		padding: 0;
		margin: 0;
	}
	.el-dialog__body {
		padding: 0;
	}
}
</style>
