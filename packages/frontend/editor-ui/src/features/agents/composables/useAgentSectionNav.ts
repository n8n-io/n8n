import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { AGENT_SECTION_KEY } from '../constants';

const SECTION_QUERY_PARAM = 'section';

/**
 * Owns the section selection (which tab/tool/section is open in the editor)
 * and per-section "raw JSON" toggle state. The view layers `canToggleRaw` /
 * `rawSectionPath` on top because those depend on the loaded config and on
 * which custom tool is selected — concerns the view already owns.
 *
 * The section is mirrored to a `?section=` query param so that hopping out
 * to a session detail view and back restores the same tab (e.g. Executions).
 */
export function useAgentSectionNav() {
	const route = useRoute();
	const router = useRouter();

	const initial =
		typeof route.query[SECTION_QUERY_PARAM] === 'string'
			? (route.query[SECTION_QUERY_PARAM] as string)
			: AGENT_SECTION_KEY;
	const selectedSection = ref<string | null>(initial);

	/**
	 * Per-section raw-JSON view toggle. Keyed by section so each tab remembers
	 * its own state independently as the user moves around.
	 */
	const rawSectionByKey = ref<Record<string, boolean>>({});

	const showRawSection = computed(() =>
		selectedSection.value ? !!rawSectionByKey.value[selectedSection.value] : false,
	);

	function syncToQuery(next: string | null) {
		const current = route.query[SECTION_QUERY_PARAM];
		if (next && current === next) return;
		if (!next && current === undefined) return;
		const query = { ...route.query };
		if (next && next !== AGENT_SECTION_KEY) {
			query[SECTION_QUERY_PARAM] = next;
		} else {
			delete query[SECTION_QUERY_PARAM];
		}
		void router.replace({ query });
	}

	watch(selectedSection, (next) => syncToQuery(next));

	// React to external query changes (e.g. browser back/forward).
	watch(
		() => route.query[SECTION_QUERY_PARAM],
		(next) => {
			const target = typeof next === 'string' ? next : AGENT_SECTION_KEY;
			if (target !== selectedSection.value) {
				selectedSection.value = target;
			}
		},
	);

	function onTreeSelect(key: string) {
		selectedSection.value = key;
	}

	function toggleRawSection() {
		const key = selectedSection.value;
		if (!key) return;
		rawSectionByKey.value = {
			...rawSectionByKey.value,
			[key]: !rawSectionByKey.value[key],
		};
	}

	function selectSection(key: string | null) {
		selectedSection.value = key;
	}

	return {
		selectedSection,
		rawSectionByKey,
		showRawSection,
		onTreeSelect,
		toggleRawSection,
		selectSection,
	};
}
