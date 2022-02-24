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
				const instanceId = this.$store.getters.instanceId;
				const logLevel = this.$store.getters['settings/logLevel'];
				this.$telemetry.init(opts, {instanceId, logLevel, store: this.$store});
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
