<script setup lang="ts">
import { N8nCommandBar } from '@n8n/design-system';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useCommandBar } from '@/features/shared/commandBar/composables/useCommandBar';
import { useThemePreview } from '@/features/shared/commandBar/composables/useThemePreview';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { commandBarEventBus } from '@/features/shared/commandBar/commandBar.eventBus';
import { useSettingsStore } from '@n8n/stores/settings.store';

const route = useRoute();
const settingsStore = useSettingsStore();

const {
	isOpen,
	query,
	activeTab,
	tabs,
	sections,
	placeholder,
	breadcrumb,
	scopeId,
	isLoading,
	hasMore,
	select,
	back,
	loadMore,
} = useCommandBar();

const { highlight } = useThemePreview();

// The theme lists preview the page live, so the backdrop must not hide it. These are the ids in useGenericCommands.
const THEME_SCOPE_IDS = new Set(['theme', 'theme-mode']);
const plainBackdrop = computed(() => !!scopeId.value && THEME_SCOPE_IDS.has(scopeId.value));

const isDemoMode = computed(() => route.name === VIEWS.DEMO);

const showCommandBar = computed(
	() => hasPermission(['authenticated']) && !isDemoMode.value && !settingsStore.isCanvasOnly,
);

watch(showCommandBar, (show) => {
	if (!show) {
		isOpen.value = false;
	}
});

watch(isOpen, (open) => {
	if (open) {
		commandBarEventBus.emit('open');
	}
});
</script>

<template>
	<N8nCommandBar
		v-if="showCommandBar"
		v-model:open="isOpen"
		v-model:query="query"
		v-model:active-tab="activeTab"
		:tabs="tabs"
		:sections="sections"
		:placeholder="placeholder"
		:breadcrumb="breadcrumb"
		:plain-backdrop="plainBackdrop"
		:is-loading="isLoading"
		:has-more="hasMore"
		@select="select"
		@back="back"
		@load-more="loadMore"
		@highlight="highlight"
	/>
</template>
