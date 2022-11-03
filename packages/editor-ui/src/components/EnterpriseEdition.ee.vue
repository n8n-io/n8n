<template>
	<div>
		<slot v-if="canAccess" />
		<slot name="fallback" v-else />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {EnterpriseEditionFeature} from "@/constants";

export default Vue.extend({
	name: 'EnterpriseEdition',
	props: {
		features: {
			type: Array,
			default: () => [] as EnterpriseEditionFeature[],
		},
	},
	computed: {
		canAccess(): boolean {
			return this.features.reduce((acc: boolean, feature) => {
				return acc && !!this.$store.getters['settings/isEnterpriseFeatureEnabled'](feature);
			}, true);
		},
	},
});
</script>
