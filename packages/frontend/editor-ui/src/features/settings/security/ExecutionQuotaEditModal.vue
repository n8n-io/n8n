<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	N8nButton,
	N8nInputLabel,
	N8nInputNumber,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectExecutionQuotaPeriodUnit } from '@/features/collaboration/projects/projects.types';
import { EXECUTION_QUOTA_EDIT_MODAL_KEY } from './executionQuota.constants';
import type { ExecutionQuotaEditModalData } from './executionQuota.constants';

// DynamicModalLoader passes `open`/`active`/`mode`/`activeId`/`modalName` alongside
// `data` — without this they fall through onto the dialog root.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data: ExecutionQuotaEditModalData;
}>();

const emit = defineEmits<{
	/**
	 * Fired after a successful save, before the modal closes. Nothing consumes
	 * this today (the modal registers through `modalRegistry`/`DynamicModalLoader`,
	 * which has no direct parent to hand the event to) — the table instead
	 * refetches by watching this modal's open state. Kept as part of the
	 * component's own contract for whichever view ends up rendering it directly.
	 */
	success: [];
}>();

const i18n = useI18n();
const { showMessage, showError } = useToast();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const modalBus = createEventBus();

const limit = ref<number>(props.data.limit);
const periodUnit = ref<ProjectExecutionQuotaPeriodUnit>(props.data.periodUnit);
const loading = ref(false);

const periodOptions: Array<{ value: ProjectExecutionQuotaPeriodUnit; label: string }> = [
	{ value: 'day', label: i18n.baseText('projects.settings.executionQuota.period.day') },
	{ value: 'week', label: i18n.baseText('projects.settings.executionQuota.period.week') },
	{ value: 'month', label: i18n.baseText('projects.settings.executionQuota.period.month') },
];

const modalTitle = computed(() =>
	i18n.baseText('settings.security.executionQuota.edit.title', {
		interpolate: { projectName: props.data.projectName },
	}),
);

// `-1` is the documented "unlimited" sentinel (see `UNLIMITED_LICENSE_QUOTA` /
// `UpdateProjectExecutionQuotaDto`), so it's the one negative value allowed
// alongside positive integers — `0` is still rejected, matching the backend DTO.
const isValid = computed(
	() => typeof limit.value === 'number' && (limit.value === -1 || limit.value >= 1),
);

function closeModal() {
	uiStore.closeModal(EXECUTION_QUOTA_EDIT_MODAL_KEY);
}

async function onSave() {
	if (!isValid.value) return;

	loading.value = true;
	try {
		await projectsStore.updateExecutionQuota(props.data.projectId, {
			limit: limit.value,
			periodUnit: periodUnit.value,
		});
		showMessage({
			type: 'success',
			title: i18n.baseText('projects.settings.executionQuota.saved'),
		});
		emit('success');
		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('projects.settings.executionQuota.saveError'));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<Modal
		:name="EXECUTION_QUOTA_EDIT_MODAL_KEY"
		:title="modalTitle"
		:event-bus="modalBus"
		width="480px"
		:close-on-esc="true"
		:close-on-click-modal="false"
		:show-close="true"
		data-test-id="execution-quota-edit-modal"
	>
		<template #content>
			<div :class="$style.form">
				<N8nInputLabel
					:label="i18n.baseText('settings.security.executionQuota.edit.limit.label')"
					color="text-dark"
				>
					<N8nInputNumber
						v-model="limit"
						:min="-1"
						:precision="0"
						data-test-id="execution-quota-edit-limit"
					/>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.executionQuota.edit.limit.hint') }}
					</N8nText>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('settings.security.executionQuota.edit.period.label')"
					color="text-dark"
				>
					<N8nSelect
						v-model="periodUnit"
						:limit-popper-width="true"
						data-test-id="execution-quota-edit-period"
					>
						<N8nOption
							v-for="opt in periodOptions"
							:key="opt.value"
							:value="opt.value"
							:label="opt.label"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:loading="loading"
					:disabled="!isValid"
					:label="i18n.baseText('generic.save')"
					data-test-id="execution-quota-edit-save"
					@click="onSave"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
