<template>
	<fragment></fragment>
</template>

<script lang="ts">
import Vue from 'vue';

import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'Telemetry',
	data() {
		return {
			initialised: false,
		};
	},
	computed: {
		...mapGetters('settings', ['telemetry']),
		...mapGetters('users', ['currentUserId']),
		isTelemeteryEnabledOnRoute(): boolean {
			return this.$route.meta && this.$route.meta.telemetry ? !this.$route.meta.telemetry.disabled: true;
		},
	},
	mounted() {
		this.init();
	},
	methods: {
		init() {
			if (this.initialised || !this.isTelemeteryEnabledOnRoute) {
				return;
			}
			const opts = this.telemetry;
			if (opts && opts.enabled) {
				this.initialised = true;
				const instanceId = this.$store.getters.instanceId;
				const userId = this.$store.getters['users/currentUserId'];
				const logLevel = this.$store.getters['settings/logLevel'];
				this.$telemetry.init(opts, { instanceId, logLevel, userId, store: this.$store });
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
		isTelemeteryEnabledOnRoute(enabled) {
			if (enabled) {
				this.init();
			}
		},
	},
});
</script>
