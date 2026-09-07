<script setup lang="ts">
import { N8nCommandBar } from '@n8n/design-system';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useStyles } from '@n8n/composables/useStyles';
import { useCommandBar } from '@/features/shared/commandBar/composables/useCommandBar';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { commandBarEventBus } from '@/features/shared/commandBar/commandBar.eventBus';
import { useSettingsStore } from '@n8n/stores/settings.store';

const route = useRoute();
const { APP_Z_INDEXES } = useStyles();
const settingsStore = useSettingsStore();

const {
	initialize: initializeCommandBar,
	items,
	placeholder,
	context,
	onCommandBarChange,
	onCommandBarNavigateTo,
	isLoading: isCommandBarLoading,
} = useCommandBar();

const isDemoMode = computed(() => route.name === VIEWS.DEMO);

const showCommandBar = computed(
	() => hasPermission(['authenticated']) && !isDemoMode.value && !settingsStore.isCanvasOnly,
);

watch(showCommandBar, (newVal) => {
	if (newVal) {
		void initializeCommandBar();
	}
});

function onCommandBarOpenChange(open: boolean) {
	if (open) {
		commandBarEventBus.emit('open');
	}
}
</script>

<template>
	<N8nCommandBar
		v-if="showCommandBar"
		:items="items"
		:placeholder="placeholder"
		:context="context"
		:is-loading="isCommandBarLoading"
		:z-index="APP_Z_INDEXES.COMMAND_BAR"
		@input-change="onCommandBarChange"
		@navigate-to="onCommandBarNavigateTo"
		@update:open="onCommandBarOpenChange"
	/>
</template>
