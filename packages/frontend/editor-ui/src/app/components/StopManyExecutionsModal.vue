<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';

import { N8nButton, N8nFormInput, N8nCallout, N8nText } from '@n8n/design-system';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { ElRow } from 'element-plus';
import { useTelemetry } from '../composables/useTelemetry';

const props = defineProps<{
	modalName: string;
}>();

const isLoading = ref(false);

const executionsStore = useExecutionsStore();
const i18n = useI18n();
const telemetry = useTelemetry();

const checkRunning = ref(true);
const checkQueued = ref(true);
const checkWaiting = ref(true);

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

const allWorkflowsHint = computed(() => {
	if (executionsStore.filters.workflowId === 'all') {
		return i18n.baseText('executionStopManyModal.allWorkflowsHint');
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
			checkQueued.value ? (['new'] as const) : [],
		].flat();

		const { startedBefore, startedAfter } = executionsStore.executionsFilters;
		isLoading.value = true;
		const { stopped: count } = await executionsStore.stopManyExecutions({
			status,
			startedBefore,
			startedAfter,
		});
		isLoading.value = false;
		toast.showMessage({
			title: i18n.baseText('executionStopManyModal.success', { interpolate: { count } }),
			type: count > 0 ? 'success' : 'info',
		});
		telemetry.track('User confirmed stop many executions', {
			waitingExecutions: checkWaiting.value,
			runningExecutions: checkRunning.value,
			queuedExecutions: checkQueued.value,
			stoppedCount: count,
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
		:title="i18n.baseText('executionStopManyModal.title')"
		:event-bus="modalBus"
		:name="props.modalName"
		:center="true"
	>
		<template #content>
			<ElRow v-if="activeFilterHint" :class="$style.vertPadding">
				<N8nCallout theme="info">
					{{ activeFilterHint }}
				</N8nCallout>
			</ElRow>
			<ElRow v-if="allWorkflowsHint" :class="$style.vertPadding">
				<N8nCallout theme="warning">
					{{ allWorkflowsHint }}
				</N8nCallout>
			</ElRow>
			<ElRow :class="$style.vertPadding">
				<N8nText color="text-base">
					{{ i18n.baseText('executionStopManyModal.description') }}
				</N8nText>
			</ElRow>
			<ElRow>
				<N8nFormInput
					v-model="checkQueued"
					type="checkbox"
					:label="i18n.baseText('executionStopManyModal.queued')"
					data-test-id="sme-check-queued"
				/>
			</ElRow>
			<ElRow>
				<N8nFormInput
					v-model="checkRunning"
					type="checkbox"
					:label="i18n.baseText('executionStopManyModal.running')"
					data-test-id="sme-check-running"
				/>
			</ElRow>
			<ElRow>
				<N8nFormInput
					v-model="checkWaiting"
					type="checkbox"
					:label="i18n.baseText('executionStopManyModal.waiting')"
					data-test-id="sme-check-waiting"
				/>
			</ElRow>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('executionStopManyModal.button.close')"
					data-test-id="sme-close-button"
					@click="closeModal"
				/>
				<N8nButton
					:disabled="!checkWaiting && !checkRunning && !checkQueued"
					:label="i18n.baseText('executionStopManyModal.button.submit')"
					:loading="isLoading"
					data-test-id="sme-submit-button"
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

.vertPadding {
	padding-bottom: var(--spacing--sm);
}
</style>
