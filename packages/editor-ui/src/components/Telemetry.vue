<template>
	<fragment></fragment>
</template>

<script lang="ts">
import Vue from 'vue';

import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'Telemetry',
	computed: {
		...mapGetters('settings', ['telemetry']),
	},
	watch: {
		telemetry(opts) {
			if (opts && opts.enabled) {
				this.$telemetry.init(opts, this.$store.getters.instanceId, this.$store.getters['settings/logLevel']);
			}
		},
	},
});
</script>
