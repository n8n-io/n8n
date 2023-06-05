<template>
	<fragment></fragment>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { ITelemetrySettings } from 'n8n-workflow';
import { externalHooks } from '@/mixins/externalHooks';

export default defineComponent({
	name: 'Telemetry',
	mixins: [externalHooks],
	data() {
		return {
			isTelemetryInitialized: false,
		};
	},
	computed: {
		...mapStores(useRootStore, useSettingsStore, useUsersStore),
		currentUserId(): string {
			return this.usersStore.currentUserId || '';
		},
		isTelemetryEnabledOnRoute(): boolean {
			return this.$route.meta && this.$route.meta.telemetry
				? !this.$route.meta.telemetry.disabled
				: true;
		},
		telemetry(): ITelemetrySettings {
			return this.settingsStore.telemetry;
		},
		isTelemetryEnabled(): boolean {
			return !!this.telemetry?.enabled;
		},
	},
	mounted() {
		this.init();
	},
	methods: {
		init() {
			if (
				this.isTelemetryInitialized ||
				!this.isTelemetryEnabledOnRoute ||
				!this.isTelemetryEnabled
			)
				return;

			this.$telemetry.init(this.telemetry, {
				instanceId: this.rootStore.instanceId,
				userId: this.currentUserId,
				versionCli: this.rootStore.versionCli,
			});

			this.isTelemetryInitialized = true;
		},
	},
	watch: {
		telemetry() {
			this.init();
		},
		currentUserId(userId) {
			if (this.isTelemetryEnabled) {
				this.$telemetry.identify(this.rootStore.instanceId, userId);
			}
		},
		isTelemetryEnabledOnRoute(enabled) {
			if (enabled) {
				this.init();
			}
		},
	},
});
</script>
