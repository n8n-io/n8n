import type { IVersionNotificationSettings } from '@n8n/api-types';
import * as versionsApi from '@/api/versions';
import { STORES, VERSIONS_MODAL_KEY } from '@/constants';
import type { IVersion } from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from './root.store';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref } from 'vue';

type SetVersionParams = { versions: IVersion[]; currentVersion: string };

export const useVersionsStore = defineStore(STORES.VERSIONS, () => {
	const versionNotificationSettings = ref({ enabled: false, endpoint: '', infoUrl: '' });
	const nextVersions = ref<IVersion[]>([]);
	const currentVersion = ref<IVersion | undefined>();

	const { showToast } = useToast();
	const uiStore = useUIStore();

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const hasVersionUpdates = computed(() => {
		return nextVersions.value.length > 0;
	});

	const areNotificationsEnabled = computed(() => {
		return versionNotificationSettings.value.enabled;
	});

	const infoUrl = computed(() => {
		return versionNotificationSettings.value.infoUrl;
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const fetchVersions = async () => {
		try {
			const { enabled, endpoint } = versionNotificationSettings.value;
			if (enabled && endpoint) {
				const rootStore = useRootStore();
				const currentVersion = rootStore.versionCli;
				const instanceId = rootStore.instanceId;
				const versions = await versionsApi.getNextVersions(endpoint, currentVersion, instanceId);
				setVersions({ versions, currentVersion });
			}
		} catch (e) {}
	};

	const setVersions = (params: SetVersionParams) => {
		nextVersions.value = params.versions.filter((v) => v.name !== params.currentVersion);
		currentVersion.value = params.versions.find((v) => v.name === params.currentVersion);
	};

	const setVersionNotificationSettings = (settings: IVersionNotificationSettings) => {
		versionNotificationSettings.value = settings;
	};

	const checkForNewVersions = async () => {
		const enabled = areNotificationsEnabled.value;
		if (!enabled) {
			return;
		}

		await fetchVersions();

		if (
			currentVersion.value &&
			currentVersion.value.hasSecurityIssue &&
			nextVersions.value.length
		) {
			const fixVersion = currentVersion.value.securityIssueFixVersion;
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
	};

	// #endregion

	return {
		currentVersion,
		nextVersions,
		hasVersionUpdates,
		areNotificationsEnabled,
		infoUrl,
		fetchVersions,
		setVersions,
		setVersionNotificationSettings,
		checkForNewVersions,
	};
});
