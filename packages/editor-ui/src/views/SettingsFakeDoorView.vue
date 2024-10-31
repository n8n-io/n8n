<script lang="ts">
import type { IFakeDoor } from '@/Interface';
import { defineComponent } from 'vue';
import FeatureComingSoon from '@/components/FeatureComingSoon.vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';

export default defineComponent({
	name: 'SettingsFakeDoorView',
	components: {
		FeatureComingSoon,
	},
	props: {
		featureId: {
			type: String,
			required: true,
		},
	},
	computed: {
		...mapStores(useUIStore),
		featureInfo(): IFakeDoor | undefined {
			return this.uiStore.fakeDoorsById[this.featureId];
		},
	},
	methods: {
		openLinkPage() {
			if (this.featureInfo) {
				window.open(this.featureInfo.linkURL, '_blank');
			}
		},
	},
});
</script>

<template>
	<FeatureComingSoon :feature-id="featureId" show-title />
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}
</style>
