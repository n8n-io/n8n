import type { IVersionNotificationSettings } from '@n8n/api-types';
import * as versionsApi from '@n8n/rest-api-client/api/versions';
import { VERSIONS_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import type { Version, WhatsNewArticle } from '@n8n/rest-api-client/api/versions';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref } from 'vue';

type SetVersionParams = { versions: Version[]; currentVersion: string };

export const useVersionsStore = defineStore(STORES.VERSIONS, () => {
	const versionNotificationSettings = ref<IVersionNotificationSettings>({
		enabled: false,
		endpoint: '',
		whatsNewEndpoint: '',
		infoUrl: '',
	});
	const nextVersions = ref<Version[]>([]);
	const currentVersion = ref<Version | undefined>();
	const whatsNewArticles = ref<WhatsNewArticle[]>([]);

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
				const current = rootStore.versionCli;
				const instanceId = rootStore.instanceId;
				const versions = await versionsApi.getNextVersions(endpoint, current, instanceId);
				setVersions({ versions, currentVersion: current });
			}
		} catch (e) {}
	};

	const setVersions = (params: SetVersionParams) => {
		nextVersions.value = params.versions.filter((v) => v.name !== params.currentVersion);
		currentVersion.value = params.versions.find((v) => v.name === params.currentVersion);
	};

	const setWhatsNew = (article: WhatsNewArticle[]) => {
		whatsNewArticles.value = article;
	};

	const fetchWhatsNew = async () => {
		try {
			const { enabled, whatsNewEndpoint } = versionNotificationSettings.value;
			if (enabled && whatsNewEndpoint) {
				const rootStore = useRootStore();
				const current = rootStore.versionCli;
				const instanceId = rootStore.instanceId;
				const articles = await versionsApi.getWhatsNewArticles(
					whatsNewEndpoint,
					current,
					instanceId,
				);
				setWhatsNew(articles);
			}
		} catch (e) {}
	};

	const initialize = (settings: IVersionNotificationSettings) => {
		versionNotificationSettings.value = settings;
	};

	const checkForNewVersions = async () => {
		const enabled = areNotificationsEnabled.value;
		if (!enabled) {
			return;
		}

		await Promise.all([fetchVersions(), fetchWhatsNew()]);

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
		initialize,
		checkForNewVersions,
		fetchWhatsNew,
		whatsNewArticles,
	};
});
