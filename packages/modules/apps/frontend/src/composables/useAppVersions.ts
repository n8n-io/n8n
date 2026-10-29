import type { AppBuildStatus, AppVersionResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { getAppBuild, listAppVersions } from '../apps.api';

const POLL_INTERVAL_MS = 3000;

function isBuilding(status: AppBuildStatus | undefined) {
	return status === 'queued' || status === 'running';
}

function isBuilt(version: AppVersionResponse) {
	return version.buildStatus === 'succeeded' && version.bundleArtifactId !== null;
}

export function useAppVersions(
	projectId: MaybeRefOrGetter<string>,
	appId: MaybeRefOrGetter<string | undefined>,
) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const latestFetch = useLatestFetch();

	const versions = ref<AppVersionResponse[]>([]);
	const loading = ref(false);
	const failed = ref(false);
	let pollTimer: ReturnType<typeof setTimeout> | undefined;

	const head = computed(() => versions.value[0] ?? null);
	const latestBuilt = computed(() => versions.value.find(isBuilt) ?? null);
	const building = computed(() => isBuilding(head.value?.buildStatus));

	function stopPolling() {
		clearTimeout(pollTimer);
		pollTimer = undefined;
	}

	function poll(id: string, versionId: string) {
		pollTimer = setTimeout(async () => {
			const isLatest = latestFetch.next();
			try {
				const build = await getAppBuild(
					rootStore.restApiContext,
					toValue(projectId),
					id,
					versionId,
				);
				if (!isLatest()) return;
				if (isBuilding(build.status)) {
					poll(id, versionId);
					return;
				}
			} catch {
				if (!isLatest()) return;
			}
			await refresh();
		}, POLL_INTERVAL_MS);
	}

	async function refresh() {
		stopPolling();
		const isLatest = latestFetch.next();
		const id = toValue(appId);
		failed.value = false;
		if (!id) {
			versions.value = [];
			loading.value = false;
			return;
		}
		loading.value = true;
		try {
			const result = await listAppVersions(rootStore.restApiContext, toValue(projectId), id);
			if (!isLatest()) return;
			versions.value = result;
			if (head.value && building.value) poll(id, head.value.id);
		} catch (error) {
			if (!isLatest()) return;
			failed.value = true;
			toast.showError(error, i18n.baseText('apps.versions.loadError'));
		} finally {
			if (isLatest()) loading.value = false;
		}
	}

	watch(() => toValue(appId), refresh, { immediate: true });

	onScopeDispose(() => {
		stopPolling();
		latestFetch.invalidate();
	});

	return { versions, head, latestBuilt, building, loading, failed, refresh };
}

export type AppVersions = ReturnType<typeof useAppVersions>;
