import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import type { SkillVersionDetail, SkillVersionSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getSkillVersion, listSkillVersions } from './useAgentApi';

/** The saved versions of one skill, and the older version the user opened. */
export function useSkillVersions(skillId: MaybeRefOrGetter<string | undefined>) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const { showError } = useToast();

	/** Newest first. Null until the Versions panel opens. */
	const versions = ref<SkillVersionSummary[] | null>(null);
	/** An older version the user opened. Null shows the latest. */
	const viewedVersion = ref<SkillVersionDetail | null>(null);

	function reportLoadError(error: unknown) {
		showError(error, i18n.baseText('agents.builder.skills.versions.loadError'));
	}

	async function loadVersions() {
		const id = toValue(skillId);
		if (!id || versions.value) return;
		try {
			versions.value = await listSkillVersions(rootStore.restApiContext, id);
		} catch (error) {
			reportLoadError(error);
		}
	}

	async function fetchVersion(version: number): Promise<SkillVersionDetail | undefined> {
		const id = toValue(skillId);
		if (!id) return undefined;
		try {
			return await getSkillVersion(rootStore.restApiContext, id, version);
		} catch (error) {
			reportLoadError(error);
			return undefined;
		}
	}

	/** Shows an older version. The latest version shows the editor again. */
	async function openVersion(version: number) {
		if (version === versions.value?.[0]?.version) {
			viewedVersion.value = null;
			return;
		}
		const detail = await fetchVersion(version);
		if (detail) viewedVersion.value = detail;
	}

	return { versions, viewedVersion, loadVersions, fetchVersion, openVersion };
}
