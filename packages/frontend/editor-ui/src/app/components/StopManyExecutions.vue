<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { createEventBus } from '@n8n/utils/event-bus';
import { ref } from 'vue';
import { useToast } from '@/app/composables/useToast';

import { N8nButton, N8nFormInput } from '@n8n/design-system';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { ElRow } from 'element-plus';
const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const modalBus = createEventBus();
const executionsStore = useExecutionsStore();

const onSubmit = async () => {
	const { workflowId } = props.data;
	try {
		const filter =
			checkWaiting.value && checkRunning.value
				? {
						status: ['waiting', 'running'],
					}
				: checkWaiting.value
					? { status: ['waiting'] }
					: { status: ['running'] };
		const date1 = beforeDate.value ? { startedBefore: beforeDate.value } : {};
		const date2 = afterDate.value ? { startedAfter: afterDate.value } : {};
		await executionsStore.stopExecutions({ ...filter, ...date1, ...date2, workflowId } as never);
	} catch (e) {
		toast.showError(e, i18n.baseText('workflowExtraction.error.failure'));
	} finally {
		modalBus.emit('close');
	}
};

function closeModal() {
	modalBus.emit('close');
}

const checkWaiting = ref(true);
const checkRunning = ref(false);
const beforeDate = ref(undefined);
const afterDate = ref(undefined);
</script>

<template>
	<Modal
		max-width="540px"
		title="Stop Executions"
		:event-bus="modalBus"
		:name="STOP_MANY_EXECUTIONS_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template #content>
			<ElRow>
				<N8nFormInput v-model="checkWaiting" type="checkbox" label="Waiting Executions" />
			</ElRow>
			<ElRow>
				<N8nFormInput v-model="checkRunning" type="checkbox" label="Running Executions" />
			</ElRow>
			<ElRow style="padding: 4px">
				<N8nFormInput v-model="beforeDate" type="date" label="Only Executions Before" />
			</ElRow>
			<ElRow style="padding: 4px">
				<N8nFormInput v-model="afterDate" type="date" label="Only Executions After" />
			</ElRow>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="tertiary"
					label="Close"
					data-test-id="variable-modal-cancel-button"
					@click="closeModal"
				/>
				<N8nButton
					:disabled="!checkWaiting && !checkRunning"
					label="Stop Executions"
					data-test-id="variable-modal-save-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
