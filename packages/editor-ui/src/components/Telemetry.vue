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
			isTelemetryInitialized: false,
		};
	},
	computed: {
		...mapGetters('settings', ['telemetry', 'logLevel', 'deploymentType']),
		...mapGetters('users', ['currentUserId']),
		...mapGetters(['instanceId']),
		isTelemetryEnabledOnRoute(): boolean {
			return this.$route.meta && this.$route.meta.telemetry ? !this.$route.meta.telemetry.disabled: true;
		},
	},
	mounted() {
		this.init();
	},
	methods: {
		init() {
			if (this.isTelemetryInitialized || !this.isTelemetryEnabledOnRoute) return;

			const telemetrySettings = this.telemetry;

			if (!telemetrySettings || !telemetrySettings.enabled) return;

			this.$telemetry.init(
				telemetrySettings,
				{
					instanceId: this.instanceId,
					userId: this.currentUserId,
					logLevel: this.logLevel,
					store: this.$store,
					deploymentType: this.deploymentType,
				},
			);

			this.isTelemetryInitialized = true;
		},
	},
	watch: {
		telemetry() {
			this.init();
		},
		currentUserId(userId) {
			this.$telemetry.identify(this.instanceId, userId);
		},
		isTelemetryEnabledOnRoute(enabled) {
			if (enabled) {
				this.init();
			}
		},
	},
});
</script>
