<template>
	<SettingsView>
		<FeatureComingSoon :featureId="featureId"></FeatureComingSoon>
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
</style>
