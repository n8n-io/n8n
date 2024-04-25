import { getNextVersions } from '@/api/versions';
import { STORES, VERSIONS_MODAL_KEY } from '@/constants';
import type { IVersion, IVersionNotificationSettings, IVersionsState } from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRoot.store';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';

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
		async checkForNewVersions() {
			const enabled = this.areNotificationsEnabled;
			if (!enabled) {
				return;
			}

			const { showToast } = useToast();
			const uiStore = useUIStore();

			await this.fetchVersions();

			const currentVersion = this.currentVersion;
			const nextVersions = this.nextVersions;

			if (currentVersion && currentVersion.hasSecurityIssue && nextVersions.length) {
				const fixVersion = currentVersion.securityIssueFixVersion;
				let message = 'Please update to latest version.';
				if (fixVersion) {
					message = `Please update to version ${fixVersion} or higher.`;
				}

				message = `${message} <a class="primary-color">More info</a>`;
				showToast({
					title: 'Critical update available',
					message,
					onClick: () => {
						uiStore.openModal(VERSIONS_MODAL_KEY);
					},
					closeOnClick: true,
					customClass: 'clickable',
					type: 'warning',
					duration: 0,
				});
			}
		},
	},
});
