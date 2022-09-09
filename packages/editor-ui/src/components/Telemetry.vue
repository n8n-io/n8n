<template>
	<fragment></fragment>
</template>

<script lang="ts">
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import { mapGetters } from 'vuex';
import { externalHooks } from './mixins/externalHooks';

export default mixins(externalHooks).extend({
	name: 'Telemetry',
	data() {
		return {
			isTelemetryInitialized: false,
		};
	},
	computed: {
		...mapGetters('settings', ['telemetry']),
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

			if (!telemetrySettings || !telemetrySettings.enabled) {
				return;
			}

			this.$telemetry.init(
				telemetrySettings,
				{
					instanceId: this.instanceId,
					userId: this.currentUserId,
					store: this.$store,
					versionCli: this.$store.getters['settings/versionCli'],
				},
			);

			this.$externalHooks().run('telemetry.currentUserIdChanged', {
				instanceId: this.instanceId,
				userId: this.currentUserId,
			});

			this.isTelemetryInitialized = true;
		},
	},
	watch: {
		telemetry() {
			this.init();
		},
		currentUserId(userId) {
			this.$telemetry.identify(this.instanceId, userId);
			this.$externalHooks().run('telemetry.currentUserIdChanged', {
				instanceId: this.instanceId,
				userId,
			});
		},
		isTelemetryEnabledOnRoute(enabled) {
			if (enabled) {
				this.init();
			}
		},
	},
});
</script>
