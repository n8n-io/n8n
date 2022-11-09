<template>
	<fragment></fragment>
</template>

<script lang="ts">
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { ITelemetrySettings } from 'n8n-workflow';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { externalHooks } from './mixins/externalHooks';

export default mixins(externalHooks).extend({
	name: 'Telemetry',
	data() {
		return {
			isTelemetryInitialized: false,
		};
	},
	computed: {
		...mapStores(
			useRootStore,
			useSettingsStore,
			useUsersStore,
		),
		currentUserId(): string {
			return this.usersStore.currentUserId || '';
		},
		isTelemetryEnabledOnRoute(): boolean {
			return this.$route.meta && this.$route.meta.telemetry ? !this.$route.meta.telemetry.disabled: true;
		},
		telemetry(): ITelemetrySettings {
			return this.settingsStore.telemetry;
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
					instanceId: this.rootStore.instanceId,
					userId: this.currentUserId,
					versionCli: this.rootStore.versionCli,
				},
			);

			this.$externalHooks().run('telemetry.currentUserIdChanged', {
				instanceId: this.rootStore.instanceId,
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
			this.$telemetry.identify(this.rootStore.instanceId, userId);
			this.$externalHooks().run('telemetry.currentUserIdChanged', {
				instanceId: this.rootStore.instanceId,
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
