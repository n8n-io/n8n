<template>
	<div>
		<slot v-if="canAccess" />
		<slot v-else name="fallback" />
	</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import type { PropType } from 'vue';
import type { EnterpriseEditionFeatureValue } from '@/Interface';

const props = defineProps({
	features: {
		type: Array as PropType<EnterpriseEditionFeatureValue[]>,
		default: () => [],
	},
});

const settingsStore = useSettingsStore();

const canAccess = computed(() => {
	return props.features.reduce((acc: boolean, feature) => {
		return acc && !!settingsStore.isEnterpriseFeatureEnabled(feature);
	}, true);
});
</script>