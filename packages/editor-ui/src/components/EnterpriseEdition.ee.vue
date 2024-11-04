<script setup lang="ts">
import { computed } from 'vue';
import type { EnterpriseEditionFeatureValue } from '@/Interface';
import { useSettingsStore } from '@/stores/settings.store';

defineOptions({ name: 'EnterpriseEdition' });

const { features = [] } = defineProps<{
	features: EnterpriseEditionFeatureValue[];
}>();

const settingsStore = useSettingsStore();

const canAccess = computed(() =>
	features.reduce(
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
