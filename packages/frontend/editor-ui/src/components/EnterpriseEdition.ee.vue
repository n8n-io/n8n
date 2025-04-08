<script setup lang="ts">
import { computed } from 'vue';
import type { EnterpriseEditionFeatureValue } from '@/Interface';
import { useSettingsStore } from '@/stores/settings.store';

const props = withDefaults(
	defineProps<{
		features: EnterpriseEditionFeatureValue[];
	}>(),
	{
		features: () => [],
	},
);

const settingsStore = useSettingsStore();

const canAccess = computed(() =>
	props.features.reduce(
		(acc: boolean, feature) => acc && !!settingsStore.isEnterpriseFeatureEnabled[feature],
		true,
	),
);
</script>

<template>
	<div>
		<slot v-if="canAccess" />
		<slot v-else name="fallback" />
	</div>
</template>
