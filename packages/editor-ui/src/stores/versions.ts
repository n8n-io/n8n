import { getNextVersions } from '@/api/versions';
import { STORES } from '@/constants';
import type { IVersion, IVersionNotificationSettings, IVersionsState } from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRootStore';

export const useVersionsStore = defineStore(STORES.VERSIONS, {
	state: (): IVersionsState => ({
		versionNotificationSettings: {
			enabled: false,
			endpoint: '',
			infoUrl: '',
		},
		nextVersions: [],
		currentVersion: undefined,
	}),
	getters: {
		hasVersionUpdates(): boolean {
			return this.nextVersions.length > 0;
		},
		areNotificationsEnabled(): boolean {
			return this.versionNotificationSettings.enabled;
		},
		infoUrl(): string {
			return this.versionNotificationSettings.infoUrl;
		},
	},
	actions: {
		setVersions({ versions, currentVersion }: { versions: IVersion[]; currentVersion: string }) {
			this.nextVersions = versions.filter((version) => version.name !== currentVersion);
			this.currentVersion = versions.find((version) => version.name === currentVersion);
		},
		setVersionNotificationSettings(settings: IVersionNotificationSettings) {
			this.versionNotificationSettings = settings;
		},
		async fetchVersions() {
			try {
				const { enabled, endpoint } = this.versionNotificationSettings;
				if (enabled && endpoint) {
					const rootStore = useRootStore();
					const currentVersion = rootStore.versionCli;
					const instanceId = rootStore.instanceId;
					const versions = await getNextVersions(endpoint, currentVersion, instanceId);
					this.setVersions({ versions, currentVersion });
				}
			} catch (e) {}
		},
	},
});
