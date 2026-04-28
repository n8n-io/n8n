import { computed, ref } from 'vue';

import { AGENT_SECTION_KEY } from '../constants';

/**
 * Owns the section selection (which tab/tool/section is open in the editor)
 * and per-section "raw JSON" toggle state. The view layers `canToggleRaw` /
 * `rawSectionPath` on top because those depend on the loaded config and on
 * which custom tool is selected — concerns the view already owns.
 */
export function useAgentSectionNav() {
	const selectedSection = ref<string | null>(AGENT_SECTION_KEY);

	/**
	 * Per-section raw-JSON view toggle. Keyed by section so each tab remembers
	 * its own state independently as the user moves around.
	 */
	const rawSectionByKey = ref<Record<string, boolean>>({});

	const showRawSection = computed(() =>
		selectedSection.value ? !!rawSectionByKey.value[selectedSection.value] : false,
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
