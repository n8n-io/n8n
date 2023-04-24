<template>
	<Modal :name="EXECUTIONS_MODAL_KEY" width="80%" :eventBus="modalBus">
		<template #content>
			<ExecutionsList @closeModal="onCloseModal" />
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ExecutionsList from '@/components/ExecutionsList.vue';
import Modal from '@/components/Modal.vue';
import { EXECUTIONS_MODAL_KEY } from '@/constants';
import { createEventBus } from '@/event-bus';

export default defineComponent({
	name: 'ExecutionsModal',
	components: {
		Modal,
		ExecutionsList,
	},
	data() {
		return {
			modalBus: createEventBus(),
			EXECUTIONS_MODAL_KEY,
		};
	},
	methods: {
		onCloseModal() {
			this.modalBus.emit('close');
		},
	},
});
</script>
