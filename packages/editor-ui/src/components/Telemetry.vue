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
		...mapGetters('users', ['currentUserId']),
	},
	mounted() {
		this.init();
	},
	methods: {
		init() {
			const opts = this.telemetry;
			if (opts && opts.enabled) {
				const instanceId = this.$store.getters.instanceId;
				const currentUserId = this.$store.getters['users/currentUserId'];
				const logLevel = this.$store.getters['settings/logLevel'];
				this.$telemetry.init(opts, { instanceId, logLevel, userId: currentUserId });
			}
		},
	},
	watch: {
		telemetry() {
			this.init();
		},
		currentUserId(userId) {
			const instanceId = this.$store.getters.instanceId;
			this.$telemetry.identify(instanceId, userId);
		},
	},
});
</script>
