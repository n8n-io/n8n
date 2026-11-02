<script setup lang="ts">
import { N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	APP_CONFIGURE_TABS,
	type AppConfigureTab,
	type AppConfigureTabEmits,
	type AppConfigureTabProps,
} from './appConfigureTabs';

defineProps<AppConfigureTabProps>();

const emit = defineEmits<AppConfigureTabEmits>();

const tab = defineModel<AppConfigureTab>('tab', { required: true });

const i18n = useI18n();

const tabOptions = computed(() =>
	APP_CONFIGURE_TABS.map(({ name }) => ({
		value: name,
		label: i18n.baseText(`apps.configure.tabs.${name}`),
	})),
);
const activeTab = computed(
	() => APP_CONFIGURE_TABS.find(({ name }) => name === tab.value) ?? APP_CONFIGURE_TABS[0],
);
</script>

<template>
	<div :class="$style.configure" data-test-id="app-view-configure">
		<N8nTabs v-model="tab" :options="tabOptions" data-test-id="app-configure-tabs" />
		<component
			:is="activeTab.component"
			:app="app"
			:versions="versions"
			@updated="emit('updated', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
.configure {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	max-width: 56rem;
	margin-inline: auto;
	padding-block: var(--spacing--xl);
}
</style>
