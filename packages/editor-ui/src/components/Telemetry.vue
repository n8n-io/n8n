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
	mounted() {
		this.init();
	},
	methods: {
		init() {
			const opts = this.telemetry;
			if (opts && opts.enabled) {
				this.$telemetry.init(opts, this.$store.getters.instanceId, this.$store.getters['settings/logLevel']);
			}
		},
	},
	watch: {
		telemetry() {
			this.init();
		},
	},
});
</script>
