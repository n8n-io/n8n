<template>
	<div>
		<slot v-if="canAccess" />
		<slot v-else name="fallback" />
	</div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { EnterpriseEditionFeatureValue } from '@/Interface';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';

export default defineComponent({
	name: 'EnterpriseEdition',
	props: {
		features: {
			type: Array as PropType<EnterpriseEditionFeatureValue[]>,
			default: () => [],
		},
	},
	computed: {
		...mapStores(useSettingsStore),
		canAccess(): boolean {
			return this.features.reduce((acc: boolean, feature) => {
				return acc && !!this.settingsStore.isEnterpriseFeatureEnabled(feature);
			}, true);
		},
	},
});
</script>
