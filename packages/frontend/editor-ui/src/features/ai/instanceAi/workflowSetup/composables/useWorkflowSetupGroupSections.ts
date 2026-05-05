import { computed, reactive, watch, type Ref } from 'vue';
import type { WorkflowSetupGroup, WorkflowSetupSection } from '../workflowSetup.types';
import { getGroupSections } from '../workflowSetup.helpers';
import { useWorkflowSetupContext } from './useWorkflowSetupContext';

/**
 * Manages per-section expansion state inside a `WorkflowSetupGroup`.
 *
 * Only sub-node sections are collapsible: the parent section renders inline
 * as the group card's primary body and is always visible. The expansion
 * model therefore tracks `subnodeSections` only.
 *
 * Sections are keyed by `section.id` (not `targetNodeName`) so the keys stay
 * stable as parent metadata changes.
 *
 * Behaviour:
 *  - Initial state: open the first incomplete sub-node in display order.
 *  - Auto-expand-next when a credential-only section completes (parent or
 *    sub-node completion both trigger the next incomplete sub-node to open).
 *  - Sections that contain parameters stay open so the user isn't interrupted
 *    mid-typing.
 */
export function useWorkflowSetupGroupSections(group: Ref<WorkflowSetupGroup>) {
	const ctx = useWorkflowSetupContext();

	const expandableSections = computed<WorkflowSetupSection[]>(() => group.value.subnodeSections);

	// Watching parent + sub-node completion together lets a parent's credential
	// completion still drive the next sub-node to open.
	const allSections = computed<WorkflowSetupSection[]>(() => getGroupSections(group.value));

	const expandedSections = reactive<Record<string, boolean>>({});

	function initExpandState() {
		for (const section of expandableSections.value) {
			if (!(section.id in expandedSections)) {
				expandedSections[section.id] = false;
			}
		}
		const firstIncomplete = expandableSections.value.find(
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

	// Auto-expand-next on completion of a credential-only section.
	const prevSectionComplete = new Map<string, boolean>();
	watch(
		// `isSectionComplete` is reactive via deps it consumes; tracking the
		// completion state of every section keeps this responsive.
		() => allSections.value.map((section) => [section.id, ctx.isSectionComplete(section)] as const),
		(states) => {
			for (const [sectionId, isComplete] of states) {
				const wasComplete = prevSectionComplete.get(sectionId) ?? false;
				if (!isComplete || wasComplete) continue;
				const section = allSections.value.find((s) => s.id === sectionId);
				if (!section || section.parameterNames.length > 0) continue;
				if (sectionId in expandedSections) {
					expandedSections[sectionId] = false;
				}
				const nextIncomplete = expandableSections.value.find(
					(s) => !ctx.isSectionComplete(s) && s.id !== sectionId,
				);
				if (nextIncomplete) {
					expandedSections[nextIncomplete.id] = true;
				}
			}
			prevSectionComplete.clear();
			for (const [sectionId, isComplete] of states) {
				prevSectionComplete.set(sectionId, isComplete);
			}
		},
		{ immediate: true },
	);

	return {
		expandedSections,
		toggleSection,
	};
}
