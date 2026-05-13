<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ExecutionPoolType, WorkerPoolDefaults } from '@n8n/api-types';
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

const i18n = useI18n();
const toast = useToast();
const orchestrationStore = useOrchestrationStore();

const formState = ref<WorkerPoolDefaults>({
	production: 'default',
	manual: 'default',
	evaluation: 'default',
});
const isLoading = ref(true);
const isSaving = ref(false);

const executionTypes: ExecutionPoolType[] = ['production', 'manual', 'evaluation'];

const availablePools = computed(() => orchestrationStore.availablePools);

const hasChanges = computed(() => {
	const persisted = orchestrationStore.poolDefaults;
	if (!persisted) return false;
	return executionTypes.some((type) => formState.value[type] !== persisted[type]);
});

const saveDisabled = computed(() => !hasChanges.value || isSaving.value);

onMounted(async () => {
	try {
		await orchestrationStore.fetchWorkerPools();
		if (orchestrationStore.poolDefaults) {
			formState.value = { ...orchestrationStore.poolDefaults };
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workerList.pools.loading.error'));
	} finally {
		isLoading.value = false;
	}
});

async function onSave() {
	const persisted = orchestrationStore.poolDefaults;
	if (!persisted) return;

	const dto: Partial<WorkerPoolDefaults> = {};
	for (const type of executionTypes) {
		if (formState.value[type] !== persisted[type]) {
			dto[type] = formState.value[type];
		}
	}

	isSaving.value = true;
	try {
		await orchestrationStore.updatePoolDefaults(dto);
		if (orchestrationStore.poolDefaults) {
			formState.value = { ...orchestrationStore.poolDefaults };
		}
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
					<N8nOption v-for="pool in availablePools" :key="pool" :label="pool" :value="pool" />
				</N8nSelect>
			</div>

			<div :class="$style.field" data-test-id="worker-pool-default-manual">
				<label>{{ i18n.baseText('workerList.pools.defaults.manual') }}</label>
				<N8nSelect v-model="formState.manual" size="medium">
					<N8nOption v-for="pool in availablePools" :key="pool" :label="pool" :value="pool" />
				</N8nSelect>
			</div>

			<div :class="$style.field" data-test-id="worker-pool-default-evaluation">
				<label>{{ i18n.baseText('workerList.pools.defaults.evaluation') }}</label>
				<N8nSelect v-model="formState.evaluation" size="medium">
					<N8nOption v-for="pool in availablePools" :key="pool" :label="pool" :value="pool" />
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
