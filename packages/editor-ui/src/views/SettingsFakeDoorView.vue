<template>
	<SettingsView>
		<FeatureComingSoon :featureId="featureId" showTitle />
	</SettingsView>
</template>

<script lang="ts">
import { IFakeDoor } from '@/Interface';
import Vue from 'vue';
import SettingsView from './SettingsView.vue';
import FeatureComingSoon from '../components/FeatureComingSoon.vue';

export default Vue.extend({
	name: 'SettingsFakeDoorView',
	components: {
		SettingsView,
		FeatureComingSoon,
	},
	props: {
		featureId: {
			type: String,
			required: true,
		},
	},
	computed: {
		featureInfo(): IFakeDoor {
			return this.$store.getters['ui/getFakeDoorFeatures'][this.featureId] as IFakeDoor;
		},
	},
	methods: {
		openLinkPage() {
			window.open(this.featureInfo.linkURL, '_blank');
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
