import { computed, reactive, watch, type Ref } from 'vue';
import type { WorkflowSetupGroup, WorkflowSetupSection } from '../workflowSetup.types';
import { getGroupSections } from '../workflowSetup.helpers';
import { useWorkflowSetupContext } from './useWorkflowSetupContext';

/**
 * Manages per-section expansion state inside a `WorkflowSetupGroup`.
 *
 * Only sub-node sections are collapsible: the root section renders inline
 * as the group card's primary body and is always visible.
 *
 * Sections that contain parameters stay open so the user isn't interrupted
 * mid-typing — only credential-only sections auto-collapse on completion.
 */
export function useWorkflowSetupGroupSections(group: Ref<WorkflowSetupGroup>) {
	const ctx = useWorkflowSetupContext();

	const allSections = computed<WorkflowSetupSection[]>(() => getGroupSections(group.value));

	const expandedSections = reactive<Record<string, boolean>>({});

	function initExpandState() {
		for (const section of group.value.subnodeSections) {
			if (!(section.id in expandedSections)) {
				expandedSections[section.id] = false;
			}
		}
		const firstIncomplete = group.value.subnodeSections.find(
			(section) => !ctx.isSectionComplete(section),
		);
		if (firstIncomplete) {
			expandedSections[firstIncomplete.id] = true;
		}
	}
	initExpandState();

	function toggleSection(sectionId: string) {
		expandedSections[sectionId] = !expandedSections[sectionId];
	}

	watch(
		() => allSections.value.map((section) => [section.id, ctx.isSectionComplete(section)] as const),
		(states, prevStates) => {
			const prev = new Map(prevStates ?? []);
			for (const [sectionId, isComplete] of states) {
				if (!isComplete || prev.get(sectionId)) continue;
				const section = allSections.value.find((s) => s.id === sectionId);
				if (!section || section.parameterNames.length > 0) continue;
				if (sectionId in expandedSections) {
					expandedSections[sectionId] = false;
				}
				const nextIncomplete = group.value.subnodeSections.find(
					(s) => !ctx.isSectionComplete(s) && s.id !== sectionId,
				);
				if (nextIncomplete) {
					expandedSections[nextIncomplete.id] = true;
				}
			}
		},
		{ immediate: true },
	);

	return {
		expandedSections,
		toggleSection,
	};
}
