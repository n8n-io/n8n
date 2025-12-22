<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';

import { N8nButton, N8nFormInput, N8nCallout } from '@n8n/design-system';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { ElRow } from 'element-plus';
import { useTelemetry } from '../composables/useTelemetry';

const props = defineProps<{
	modalName: string;
}>();

const executionsStore = useExecutionsStore();
const i18n = useI18n();
const telemetry = useTelemetry();

const checkWaiting = ref(false);
const checkRunning = ref(false);

const activeFilterHint = computed(() => {
	const { startedBefore, startedAfter } = executionsStore.executionsFilters;
	if (startedBefore && startedAfter) {
		return i18n.baseText('executionStopManyModal.dateHint.startEnd', {
			interpolate: { startedBefore, startedAfter },
		});
	} else if (startedAfter) {
		return i18n.baseText('executionStopManyModal.dateHint.startOnly', {
			interpolate: { startedAfter },
		});
	} else if (startedBefore) {
		return i18n.baseText('executionStopManyModal.dateHint.endOnly', {
			interpolate: { startedBefore },
		});
	}

	return '';
});

const toast = useToast();
const modalBus = createEventBus();

const onSubmit = async () => {
	try {
		const status = [
			checkWaiting.value ? (['waiting'] as const) : [],
			checkRunning.value ? (['running'] as const) : [],
		].flat();
		telemetry.track('User confirmed stop many executions', {
			waitingExecutions: checkWaiting.value,
			runningExecutions: checkRunning.value,
		});
		const { startedBefore, startedAfter } = executionsStore.executionsFilters;

		const count = await executionsStore.stopManyExecutions({
			status,
			startedBefore,
			startedAfter,
		});
		toast.showMessage({
			title: i18n.baseText('executionStopManyModal.success', { interpolate: { count } }),
			type: count > 0 ? 'success' : 'info',
		});
	} catch (e) {
		toast.showError(e, i18n.baseText('executionStopManyModal.error.failure'));
	} finally {
		modalBus.emit('close');
	}
};

function closeModal() {
	modalBus.emit('close');
}
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
			<ElRow v-if="activeFilterHint">
				<N8nCallout theme="info">
					{{ activeFilterHint }}
				</N8nCallout>
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
