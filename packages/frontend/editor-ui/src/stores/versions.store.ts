import type { IVersionNotificationSettings } from '@n8n/api-types';
import * as versionsApi from '@n8n/rest-api-client/api/versions';
import { LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES, VERSIONS_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import type { Version, WhatsNewArticle } from '@n8n/rest-api-client/api/versions';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref } from 'vue';
import { useSettingsStore } from './settings.store';
import { useStorage } from '@/composables/useStorage';
import { jsonParse } from 'n8n-workflow';

type SetVersionParams = { versions: Version[]; currentVersion: string };

export const useVersionsStore = defineStore(STORES.VERSIONS, () => {
	const versionNotificationSettings = ref<IVersionNotificationSettings>({
		enabled: false,
		whatsNewEnabled: false,
		endpoint: '',
		whatsNewEndpoint: '',
		infoUrl: '',
	});
	const nextVersions = ref<Version[]>([]);
	const currentVersion = ref<Version | undefined>();
	const whatsNewArticles = ref<WhatsNewArticle[]>([]);

	const { showToast } = useToast();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const readWhatsNewArticlesStorage = useStorage(LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES);

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const hasVersionUpdates = computed(() => {
		return settingsStore.settings.releaseChannel === 'stable' && nextVersions.value.length > 0;
	});

	const latestVersion = computed(() => {
		return nextVersions.value[0] ?? currentVersion.value;
	});

	const areNotificationsEnabled = computed(() => {
		return versionNotificationSettings.value.enabled;
	});

	const infoUrl = computed(() => {
		return versionNotificationSettings.value.infoUrl;
	});

	const readWhatsNewArticles = computed((): number[] => {
		return readWhatsNewArticlesStorage.value
			? jsonParse(readWhatsNewArticlesStorage.value, { fallbackValue: [] })
			: [];
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
			const { enabled, whatsNewEnabled, whatsNewEndpoint } = versionNotificationSettings.value;
			if (enabled && whatsNewEnabled && whatsNewEndpoint) {
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

	const setWhatsNewArticleRead = (articleId: number) => {
		if (!readWhatsNewArticles.value.includes(articleId)) {
			readWhatsNewArticlesStorage.value = JSON.stringify([
				...readWhatsNewArticles.value,
				articleId,
			]);
		}
	};

	const isWhatsNewArticleRead = (articleId: number): boolean => {
		return readWhatsNewArticles.value.includes(articleId);
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
		latestVersion,
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
		isWhatsNewArticleRead,
		setWhatsNewArticleRead,
	};
});
