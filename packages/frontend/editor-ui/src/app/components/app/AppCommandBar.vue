<script setup lang="ts">
import { N8nCommandBar } from '@n8n/design-system';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useStyles } from '@/app/composables/useStyles';
import { useCommandBar } from '@/features/shared/commandBar/composables/useCommandBar';
import { hasPermission } from '@/app/utils/rbac/permissions';

const route = useRoute();
const { APP_Z_INDEXES } = useStyles();

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

const showCommandBar = computed(() => hasPermission(['authenticated']) && !isDemoMode.value);

watch(showCommandBar, (newVal) => {
	if (newVal) {
		void initializeCommandBar();
	}
});
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
	/>
</template>
