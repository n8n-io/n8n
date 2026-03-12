<script lang="ts" setup>
import { watch } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ModelSection from './ModelSection.vue';
import MemorySection from './MemorySection.vue';
import FileAccessSection from './FileAccessSection.vue';
import SandboxSection from './SandboxSection.vue';
import SearchSection from './SearchSection.vue';
import AdvancedSection from './AdvancedSection.vue';
import PermissionsSection from './PermissionsSection.vue';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiSettingsStore();

watch(
	() => store.settings,
	(val) => {
		if (!val) void store.fetch();
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="cog" size="small" />
				<span>{{ i18n.baseText('instanceAi.settings.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div :class="$style.body">
			<div v-if="store.isLoading" :class="$style.loading">
				<N8nIcon icon="spinner" spin />
			</div>
			<div v-else-if="store.settings" :class="$style.sections">
				<ModelSection />
				<MemorySection />
				<FileAccessSection />
				<SandboxSection />
				<SearchSection />
				<AdvancedSection />
				<PermissionsSection />
			</div>
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
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 400px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.footer {
	display: flex;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
	flex-shrink: 0;
}

.resetButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
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
	font-size: var(--font-size--2xs);
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
