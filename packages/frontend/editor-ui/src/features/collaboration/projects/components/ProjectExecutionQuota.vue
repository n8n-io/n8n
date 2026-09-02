<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nButton, N8nInputNumber, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useProjectsStore } from '../projects.store';
import type { ProjectExecutionQuotaPeriodUnit } from '../projects.types';

const props = defineProps<{ projectId: string; canManage: boolean }>();

const i18n = useI18n();
const toast = useToast();
const projectsStore = useProjectsStore();

const limit = ref<number | undefined>();
const periodUnit = ref<ProjectExecutionQuotaPeriodUnit>('day');
const consumed = ref(0);
const isLoading = ref(false);

const periodOptions: Array<{ value: ProjectExecutionQuotaPeriodUnit; label: string }> = [
	{ value: 'day', label: i18n.baseText('projects.settings.executionQuota.period.day') },
	{ value: 'week', label: i18n.baseText('projects.settings.executionQuota.period.week') },
	{ value: 'month', label: i18n.baseText('projects.settings.executionQuota.period.month') },
];

onMounted(async () => {
	try {
		const quota = await projectsStore.getExecutionQuota(props.projectId);
		limit.value = quota.limit;
		periodUnit.value = quota.periodUnit;
		consumed.value = quota.consumed;
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.executionQuota.saveError'));
	}
});

const save = async () => {
	if (limit.value === undefined) return;
	isLoading.value = true;
	try {
		await projectsStore.updateExecutionQuota(props.projectId, {
			limit: limit.value,
			periodUnit: periodUnit.value,
		});
		toast.showMessage({
			title: i18n.baseText('projects.settings.executionQuota.saved'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.executionQuota.saveError'));
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<fieldset data-test-id="project-execution-quota">
		<h3 class="mb-2xs">
			<N8nText tag="span" size="medium" bold>
				{{ i18n.baseText('projects.settings.executionQuota.title') }}
			</N8nText>
		</h3>
		<N8nText tag="p" size="small" color="text-light" class="pb-xs">
			{{ i18n.baseText('projects.settings.executionQuota.description') }}
		</N8nText>
		<div v-if="props.canManage" :class="$style.controls">
			<N8nInputNumber
				v-model="limit"
				:min="1"
				:precision="0"
				data-test-id="execution-quota-limit"
			/>
			<N8nSelect
				v-model="periodUnit"
				:limit-popper-width="true"
				data-test-id="execution-quota-period"
			>
				<N8nOption
					v-for="opt in periodOptions"
					:key="opt.value"
					:value="opt.value"
					:label="opt.label"
				/>
			</N8nSelect>
			<N8nButton :loading="isLoading" data-test-id="execution-quota-save" @click="save">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</div>
		<N8nText v-else tag="p" size="small" data-test-id="execution-quota-readonly">
			{{ consumed }} / {{ limit ?? '∞' }} {{ periodUnit }}
		</N8nText>
	</fieldset>
</template>

<style lang="scss" module>
.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
