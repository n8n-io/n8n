<template>
	<fragment></fragment>
</template>

<script lang="ts">
import Vue from 'vue';

import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'Telemetry',
	computed: {
		...mapGetters(['telemetry']),
	},
	watch: {
		telemetry(opts) {
			if (opts.enabled) {
				this.$telemetry.init(opts, this.$store.getters.instanceId);
			}
		},
	},
});
</script>
