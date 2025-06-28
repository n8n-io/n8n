import type { IVersionNotificationSettings } from '@n8n/api-types';
import * as versionsApi from '@n8n/rest-api-client/api/versions';
import {
	LOCAL_STORAGE_DISMISSED_WHATS_NEW_CALLOUT,
	LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES,
	VERSIONS_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { Version, WhatsNewSection } from '@n8n/rest-api-client/api/versions';
import { defineStore } from 'pinia';
import type { NotificationHandle } from 'element-plus';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref } from 'vue';
import { useSettingsStore } from './settings.store';
import { useStorage } from '@/composables/useStorage';
import { jsonParse } from 'n8n-workflow';
import { useTelemetry } from '@/composables/useTelemetry';

type SetVersionParams = { versions: Version[]; currentVersion: string };

/**
 * Semantic versioning 2.0.0, Regex from https://semver.org/
 * Capture groups: major, minor, patch, prerelease, buildmetadata
 */
export const SEMVER_REGEX =
	/^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

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
	const whatsNew = ref<WhatsNewSection>({
		title: '',
		createdAt: new Date().toISOString(),
		updatedAt: null,
		calloutText: '',
		footer: '',
		items: [],
	});
	const whatsNewCallout = ref<NotificationHandle | undefined>();

	const telemetry = useTelemetry();
	const { showToast, showMessage } = useToast();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const readWhatsNewArticlesStorage = useStorage(LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES);
	const lastDismissedWhatsNewCalloutStorage = useStorage(LOCAL_STORAGE_DISMISSED_WHATS_NEW_CALLOUT);

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const hasVersionUpdates = computed(() => {
		return settingsStore.settings.releaseChannel === 'stable' && nextVersions.value.length > 0;
	});

	const hasSignificantUpdates = computed(() => {
		if (!hasVersionUpdates.value || !currentVersion.value || !latestVersion.value) return false;

		// Always consider security issues as significant updates
		if (currentVersion.value.hasSecurityIssue) return true;

		const current = currentVersion.value.name.match(SEMVER_REGEX);
		const latest = latestVersion.value.name.match(SEMVER_REGEX);

		if (!current?.groups || !latest?.groups) return false;

		// Major change is always significant
		if (Number(current.groups.major) !== Number(latest.groups.major)) {
			return true;
		}

		const currentMinor = Number(current.groups.minor);
		const latestMinor = Number(latest.groups.minor);

		// Otherwise two minor versions is enough to be considered significant
		return latestMinor - currentMinor >= 2;
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

	const lastDismissedWhatsNewCallout = computed((): number[] => {
		return lastDismissedWhatsNewCalloutStorage.value
			? jsonParse(lastDismissedWhatsNewCalloutStorage.value, { fallbackValue: [] })
			: [];
	});

	const whatsNewArticles = computed(() => {
		return whatsNew.value.items;
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

	const setWhatsNew = (section: WhatsNewSection) => {
		whatsNew.value = section;
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

	const closeWhatsNewCallout = () => {
		whatsNewCallout.value?.close();
		whatsNewCallout.value = undefined;
	};

	const dismissWhatsNewCallout = () => {
		lastDismissedWhatsNewCalloutStorage.value = JSON.stringify(
			whatsNewArticles.value.map((item) => item.id),
		);
	};

	const shouldShowWhatsNewCallout = (): boolean => {
		return !whatsNewArticles.value.every((item) =>
			lastDismissedWhatsNewCallout.value.includes(item.id),
		);
	};

	const fetchWhatsNew = async () => {
		try {
			const { enabled, whatsNewEnabled, whatsNewEndpoint } = versionNotificationSettings.value;
			if (enabled && whatsNewEnabled && whatsNewEndpoint) {
				const rootStore = useRootStore();
				const current = rootStore.versionCli;
				const instanceId = rootStore.instanceId;
				const section = await versionsApi.getWhatsNewSection(whatsNewEndpoint, current, instanceId);

				if (section.items?.length > 0) {
					setWhatsNew(section);

					if (shouldShowWhatsNewCallout()) {
						whatsNewCallout.value = showMessage({
							title: whatsNew.value.title,
							message: whatsNew.value.calloutText,
							duration: 0,
							position: 'bottom-left',
							customClass: 'clickable whats-new-notification',
							onClick: () => {
								const articleId = whatsNew.value.items[0]?.id ?? 0;
								telemetry.track("User clicked on what's new notification", {
									article_id: articleId,
								});
								uiStore.openModalWithData({
									name: WHATS_NEW_MODAL_KEY,
									data: { articleId },
								});
							},
							onClose: () => {
								dismissWhatsNewCallout();
							},
						});
					}
				}
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
		latestVersion,
		nextVersions,
		hasVersionUpdates,
		hasSignificantUpdates,
		areNotificationsEnabled,
		infoUrl,
		fetchVersions,
		setVersions,
		initialize,
		checkForNewVersions,
		fetchWhatsNew,
		whatsNew,
		whatsNewArticles,
		isWhatsNewArticleRead,
		setWhatsNewArticleRead,
		closeWhatsNewCallout,
	};
});
