<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ExecutionCategory, PoolAssignment } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useToast } from '@/app/composables/useToast';
import { useOrchestrationStore } from '../orchestration.store';

const DEFAULT_POOL_VALUE = '';

const i18n = useI18n();
const toast = useToast();
const orchestrationStore = useOrchestrationStore();

const executionCategories: ExecutionCategory[] = ['production', 'manual', 'evaluation'];

const formState = ref<Record<ExecutionCategory, string>>({
	production: DEFAULT_POOL_VALUE,
	manual: DEFAULT_POOL_VALUE,
	evaluation: DEFAULT_POOL_VALUE,
});
const isLoading = ref(true);
const isSaving = ref(false);

const availablePools = computed(() => orchestrationStore.availablePools);

const poolOptions = computed(() => [
	{ label: i18n.baseText('workerList.pools.defaults.unassigned'), value: DEFAULT_POOL_VALUE },
	...availablePools.value.map((pool) => ({ label: pool, value: pool })),
]);

const persistedFormState = computed<Record<ExecutionCategory, string>>(() => {
	const assignment = orchestrationStore.poolAssignment ?? {};
	return {
		production: assignment.production ?? DEFAULT_POOL_VALUE,
		manual: assignment.manual ?? DEFAULT_POOL_VALUE,
		evaluation: assignment.evaluation ?? DEFAULT_POOL_VALUE,
	};
});

const hasChanges = computed(() => {
	const persisted = persistedFormState.value;
	return executionCategories.some((category) => formState.value[category] !== persisted[category]);
});

const saveDisabled = computed(() => !hasChanges.value || isSaving.value);

onMounted(async () => {
	try {
		await orchestrationStore.fetchWorkerPools();
		formState.value = { ...persistedFormState.value };
	} catch (error) {
		toast.showError(error, i18n.baseText('workerList.pools.loading.error'));
	} finally {
		isLoading.value = false;
	}
});

async function onSave() {
	const persisted = persistedFormState.value;

	const dto: PoolAssignment = {};
	for (const category of executionCategories) {
		if (formState.value[category] !== persisted[category]) {
			dto[category] = formState.value[category];
		}
	}

	isSaving.value = true;
	try {
		await orchestrationStore.updateWorkerPoolAssignment(dto);
		formState.value = { ...persistedFormState.value };
		toast.showMessage({
			title: i18n.baseText('workerList.pools.defaults.saved.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('workerList.pools.defaults.saved.error'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<N8nCard v-if="!isLoading" data-test-id="worker-pools-card" :class="$style.card">
		<template #header>
			<N8nHeading tag="h2" size="medium" bold>
				{{ i18n.baseText('workerList.pools.title') }}
			</N8nHeading>
		</template>

		<div :class="$style.section">
			<N8nText tag="div" bold size="small" :class="$style.sectionTitle">
				{{ i18n.baseText('workerList.pools.available.title') }}
			</N8nText>
			<div v-if="availablePools.length === 0" :class="$style.empty">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('workerList.pools.available.empty') }}
				</N8nText>
			</div>
			<div v-else :class="$style.badges">
				<N8nBadge
					v-for="pool in availablePools"
					:key="pool"
					theme="tertiary"
					data-test-id="worker-pool-badge"
				>
					{{ pool }}
				</N8nBadge>
			</div>
		</div>

		<div :class="$style.section">
			<N8nText tag="div" bold size="small" :class="$style.sectionTitle">
				{{ i18n.baseText('workerList.pools.defaults.title') }}
			</N8nText>
			<N8nText color="text-light" size="small" :class="$style.sectionDescription">
				{{ i18n.baseText('workerList.pools.defaults.description') }}
			</N8nText>

			<div :class="$style.field" data-test-id="worker-pool-default-production">
				<label>{{ i18n.baseText('workerList.pools.defaults.production') }}</label>
				<N8nSelect v-model="formState.production" size="medium">
					<N8nOption
						v-for="option in poolOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
			</div>

			<div :class="$style.field" data-test-id="worker-pool-default-manual">
				<label>{{ i18n.baseText('workerList.pools.defaults.manual') }}</label>
				<N8nSelect v-model="formState.manual" size="medium">
					<N8nOption
						v-for="option in poolOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
			</div>

			<div :class="$style.field" data-test-id="worker-pool-default-evaluation">
				<label>{{ i18n.baseText('workerList.pools.defaults.evaluation') }}</label>
				<N8nSelect v-model="formState.evaluation" size="medium">
					<N8nOption
						v-for="option in poolOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
			</div>

			<div :class="$style.actions">
				<N8nButton
					:disabled="saveDisabled"
					:loading="isSaving"
					data-test-id="worker-pools-save"
					@click="onSave"
				>
					{{ i18n.baseText('workerList.pools.defaults.save') }}
				</N8nButton>
			</div>
		</div>
	</N8nCard>
</template>

<style module lang="scss">
.card {
	padding: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) 0;

	&:not(:last-child) {
		border-bottom: var(--border--base);
	}
}

.sectionTitle {
	margin-bottom: var(--spacing--3xs);
}

.sectionDescription {
	margin-bottom: var(--spacing--xs);
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.empty {
	padding: var(--spacing--2xs) 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--xs);

	label {
		font-size: var(--font-size--xs);
		color: var(--color--text--shade-1);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--xs);
}
</style>
