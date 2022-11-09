<template>
	<feature-coming-soon :featureId="featureId" showTitle />
</template>

<script lang="ts">
import { IFakeDoor } from '@/Interface';
import Vue from 'vue';
import FeatureComingSoon from '@/components/FeatureComingSoon.vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';

export default Vue.extend({
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
		featureInfo(): IFakeDoor|undefined {
			return this.uiStore.getFakeDoorById(this.featureId);
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
