<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useCatalogStore } from '@/features/catalog/catalog.store';
import type { CatalogEntry } from '@/features/catalog/catalog.types';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const catalogStore = useCatalogStore();

const loading = ref(true);
const selected = ref<CatalogEntry | null>(null);
const inputs = ref<Record<string, string>>({});
const running = ref(false);

const runs = computed(() => catalogStore.runs);

onMounted(async () => {
	documentTitle.set(i18n.baseText('catalog.heading'));
	try {
		await Promise.all([catalogStore.fetchWorkflows(), catalogStore.fetchRuns()]);
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.load.error'));
	} finally {
		loading.value = false;
	}
});

const select = (entry: CatalogEntry) => {
	selected.value = entry;
	// Start each form clean rather than carrying the previous workflow's values.
	inputs.value = Object.fromEntries(entry.fields.map((field) => [field.name, '']));
};

const run = async () => {
	if (!selected.value) return;

	running.value = true;
	try {
		await catalogStore.run(selected.value.id, { ...inputs.value });
		toast.showMessage({
			title: i18n.baseText('catalog.run.started'),
			type: 'success',
		});
		selected.value = null;
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.run.error'));
	} finally {
		running.value = false;
	}
};
</script>

<template>
	<div :class="$style.page" data-test-id="catalog-view">
		<N8nHeading tag="h1" size="xlarge">{{ i18n.baseText('catalog.heading') }}</N8nHeading>
		<N8nText color="text-light">{{ i18n.baseText('catalog.subheading') }}</N8nText>

		<N8nSpinner v-if="loading" />

		<template v-else>
			<N8nNotice v-if="catalogStore.truncated" theme="warning">
				{{ i18n.baseText('catalog.truncated') }}
			</N8nNotice>

			<N8nText v-if="catalogStore.isEmpty" color="text-light" data-test-id="catalog-empty">
				{{ i18n.baseText('catalog.empty') }}
			</N8nText>

			<div v-else :class="$style.list">
				<N8nCard
					v-for="entry in catalogStore.workflows"
					:key="entry.id"
					:class="$style.card"
					data-test-id="catalog-workflow"
					@click="select(entry)"
				>
					<N8nText bold>{{ entry.name }}</N8nText>
					<N8nText v-if="entry.description" size="small" color="text-light">
						{{ entry.description }}
					</N8nText>
				</N8nCard>
			</div>

			<div v-if="selected" :class="$style.runner" data-test-id="catalog-runner">
				<N8nHeading tag="h2" size="medium">{{ selected.name }}</N8nHeading>

				<N8nInputLabel
					v-for="field in selected.fields"
					:key="field.name"
					:label="field.name"
					:class="$style.field"
				>
					<N8nInput v-model="inputs[field.name]" :name="field.name" />
				</N8nInputLabel>

				<N8nButton
					:label="i18n.baseText('catalog.run')"
					:loading="running"
					data-test-id="catalog-run-button"
					@click="run"
				/>
			</div>

			<N8nHeading tag="h2" size="medium">{{ i18n.baseText('catalog.runs.heading') }}</N8nHeading>

			<N8nText v-if="runs.length === 0" color="text-light">
				{{ i18n.baseText('catalog.runs.empty') }}
			</N8nText>

			<div v-else :class="$style.list">
				<N8nCard v-for="item in runs" :key="item.id" data-test-id="catalog-run">
					<N8nText>{{ item.workflowName }}</N8nText>
					<N8nBadge>{{ item.status }}</N8nBadge>
				</N8nCard>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	padding: var(--spacing-l);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.card {
	cursor: pointer;
}

.runner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	padding: var(--spacing-s);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
}

.field {
	display: block;
}
</style>
