import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import type { SkillVersionDetail, SkillVersionSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { countsByFile, diffSkills } from '../components/skillVersions/skillVersionDiff';
import type { AgentSkill } from '../types';
import { getSkillVersion, listSkillVersions } from './useAgentApi';

/**
 * The saved versions of one skill, and the version the user opened. `baseVersion` is the version
 * the editor shows: a pinned agent's version in the builder, else the latest.
 */
export function useSkillVersions(
	skillId: MaybeRefOrGetter<string | undefined>,
	baseVersion?: MaybeRefOrGetter<number | undefined>,
) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const { showError } = useToast();

	/** Newest first. Null until the Versions panel opens. */
	const versions = ref<SkillVersionSummary[] | null>(null);
	/** An older version the user opened. Null shows the latest. */
	const viewedVersion = ref<SkillVersionDetail | null>(null);
	// A saved version never changes, so a fetched one is kept, keyed by skill and version.
	const fetched = new Map<string, SkillVersionDetail>();

	function reportLoadError(error: unknown) {
		showError(error, i18n.baseText('agents.builder.skills.versions.loadError'));
	}

	/** The skill that `versions` belongs to, so another skill loads its own list. */
	let versionsOf: string | undefined;

	async function loadVersions() {
		const id = toValue(skillId);
		if (!id || (versions.value && versionsOf === id)) return;
		try {
			const list = await listSkillVersions(rootStore.restApiContext, id);
			// The skill can change while the list loads. Keep only the list of the current skill.
			if (toValue(skillId) !== id) return;
			versions.value = list;
			versionsOf = id;
		} catch (error) {
			reportLoadError(error);
		}
	}

	/** Loads the list again, for example after a save added a version. */
	async function reloadVersions() {
		versionsOf = undefined;
		await loadVersions();
	}

	async function fetchVersion(version: number): Promise<SkillVersionDetail | undefined> {
		const id = toValue(skillId);
		if (!id) return undefined;
		const key = `${id}:${version}`;
		const cached = fetched.get(key);
		if (cached) return cached;
		try {
			const detail = await getSkillVersion(rootStore.restApiContext, id, version);
			fetched.set(key, detail);
			return detail;
		} catch (error) {
			reportLoadError(error);
			return undefined;
		}
	}

	/** The version the user asked for last, so a slower earlier answer cannot replace it. */
	let requestedVersion: number | null = null;

	/** Shows another version. The base version shows the editor again. */
	async function openVersion(version: number) {
		requestedVersion = version;
		if (version === (toValue(baseVersion) ?? versions.value?.[0]?.version)) {
			viewedVersion.value = null;
			return;
		}
		const detail = await fetchVersion(version);
		if (detail && requestedVersion === version) viewedVersion.value = detail;
	}

	/** Compare mode: the two versions and their skills, older first. Null outside compare mode. */
	const comparison = shallowRef<{
		from: number;
		to: number;
		fromSkill: AgentSkill;
		toSkill: AgentSkill;
	} | null>(null);
	const diffSections = computed(() =>
		comparison.value ? diffSkills(comparison.value.fromSkill, comparison.value.toSkill) : [],
	);
	const diffCounts = computed(() => countsByFile(diffSections.value));
	/** The compared skill with every file either version has, for the file list. */
	const comparedSkill = computed<AgentSkill | null>(() => {
		if (!comparison.value) return null;
		const { fromSkill, toSkill } = comparison.value;
		const paths = new Set((toSkill.references ?? []).map((file) => file.path));
		return {
			...toSkill,
			references: [
				...(toSkill.references ?? []),
				...(fromSkill.references ?? []).filter((file) => !paths.has(file.path)),
			],
		};
	});

	/** Compares two versions, in either order. */
	let compareRequest = 0;

	async function compareVersions(a: number, b: number) {
		const [from, to] = a < b ? [a, b] : [b, a];
		const request = ++compareRequest;
		const [fromDetail, toDetail] = await Promise.all([fetchVersion(from), fetchVersion(to)]);
		// A later pick of the version selectors wins over a slower earlier one.
		if (!fromDetail || !toDetail || request !== compareRequest) return;
		comparison.value = { from, to, fromSkill: fromDetail.skill, toSkill: toDetail.skill };
	}

	/** Compares the latest version with the one before it, when there are two. */
	async function compareLatestTwo() {
		await loadVersions();
		const [latest, previous] = versions.value ?? [];
		if (latest && previous) await compareVersions(previous.version, latest.version);
	}

	return {
		versions,
		viewedVersion,
		loadVersions,
		reloadVersions,
		fetchVersion,
		openVersion,
		comparison,
		diffSections,
		diffCounts,
		comparedSkill,
		compareVersions,
		compareLatestTwo,
	};
}
