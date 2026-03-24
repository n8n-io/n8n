<script lang="ts" setup>
import { onMounted, watch } from 'vue';
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import ModelSection from '../components/settings/ModelSection.vue';
import MemorySection from '../components/settings/MemorySection.vue';
import LocalGatewaySection from '../components/settings/LocalGatewaySection.vue';
import SandboxSection from '../components/settings/SandboxSection.vue';
import SearchSection from '../components/settings/SearchSection.vue';
import AdvancedSection from '../components/settings/AdvancedSection.vue';
import PermissionsSection from '../components/settings/PermissionsSection.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const store = useInstanceAiSettingsStore();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.instanceAi'));
});

watch(
	() => store.settings,
	(val) => {
		if (!val) void store.fetch();
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-settings">
		<header :class="$style.header">
			<N8nHeading size="2xlarge" class="mb-2xs">
				{{ i18n.baseText('settings.instanceAi') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.instanceAi.description') }}
			</N8nText>
		</header>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<div v-else-if="store.settings" :class="$style.sections">
			<ModelSection />
			<MemorySection />
			<LocalGatewaySection />
			<SandboxSection />
			<SearchSection />
			<AdvancedSection />
			<PermissionsSection />
		</div>

		<div :class="$style.footer">
			<button
				:class="$style.resetButton"
				:disabled="!store.isDirty || store.isSaving"
				@click="store.reset()"
			>
				{{ i18n.baseText('instanceAi.settings.reset') }}
			</button>
			<button
				:class="$style.saveButton"
				:disabled="!store.isDirty || store.isSaving"
				@click="store.save()"
			>
				{{ store.isSaving ? '...' : i18n.baseText('instanceAi.settings.save') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing--xl);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	max-width: 720px;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg) 0;
	max-width: 720px;
}

.resetButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text--tint-1);

	&:hover:not(:disabled) {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.saveButton {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	cursor: pointer;
	border: none;
	background: var(--color--primary);
	color: white;

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
</style>
