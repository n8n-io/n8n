import { computed, reactive, ref, watch, type Ref } from 'vue';
import type { INodeProperties } from 'n8n-workflow';

import type { NodeGroupItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

/**
 * Returns true when a section has required parameters (issues or additional parameter names).
 * Sections with parameters stay expanded so the user isn't interrupted mid-input.
 */
export const sectionHasParameters = (section: NodeSetupState) =>
	Object.keys(section.parameterIssues).length > 0 ||
	(section.additionalParameterNames?.length ?? 0) > 0;

/**
 * Shared composable for node-group section management.
 * Used by both `BuilderNodeGroupCard` (wizard) and `NodeGroupSetupCard` (panel).
 */
export function useNodeGroupSections(nodeGroup: Ref<NodeGroupItem>) {
	const nodeTypesStore = useNodeTypesStore();

	// ── Computed sections ───────────────────────────────────────────────

	const parentNodeType = computed(() =>
		nodeTypesStore.getNodeType(
			nodeGroup.value.parentNode.type,
			nodeGroup.value.parentNode.typeVersion,
		),
	);

	const subnodeSections = computed<NodeSetupState[]>(() => nodeGroup.value.subnodeCards);

	/** All sections including parent state — used for completion tracking */
	const allSections = computed<NodeSetupState[]>(() => {
		const sections: NodeSetupState[] = [];
		if (nodeGroup.value.parentState) sections.push(nodeGroup.value.parentState);
		sections.push(...subnodeSections.value);
		return sections;
	});

	// ── Sticky parameter tracking ───────────────────────────────────────

	const stickyParametersMap = reactive<Record<string, INodeProperties[]>>({});

	function getStickyParameters(nodeId: string): INodeProperties[] {
		if (!stickyParametersMap[nodeId]) {
			stickyParametersMap[nodeId] = [];
		}
		return stickyParametersMap[nodeId];
	}

	function addStickyParameters(nodeId: string, params: INodeProperties[]) {
		getStickyParameters(nodeId).push(...params);
	}

	// ── Section expand/collapse ─────────────────────────────────────────

	const expandedSections = reactive<Record<string, boolean>>({});

	function initExpandState() {
		for (const section of allSections.value) {
			if (!(section.node.id in expandedSections)) {
				expandedSections[section.node.id] = false;
			}
		}
		const firstIncomplete = allSections.value.find((s) => !s.isComplete);
		if (firstIncomplete) {
			expandedSections[firstIncomplete.node.id] = true;
		}
	}
	initExpandState();

	function toggleSection(nodeId: string) {
		expandedSections[nodeId] = !expandedSections[nodeId];
	}

	// Auto-expand next incomplete when a credential-only section completes.
	// Sections with parameters stay open so the user isn't interrupted mid-input.
	const prevSectionComplete = new Map<string, boolean>();
	watch(
		allSections,
		(sections) => {
			for (const section of sections) {
				const wasComplete = prevSectionComplete.get(section.node.id) ?? false;
				if (section.isComplete && !wasComplete && !sectionHasParameters(section)) {
					expandedSections[section.node.id] = false;
					const nextIncomplete = sections.find(
						(s) => !s.isComplete && s.node.id !== section.node.id,
					);
					if (nextIncomplete) {
						expandedSections[nextIncomplete.node.id] = true;
					}
				}
			}
			prevSectionComplete.clear();
			for (const section of sections) {
				prevSectionComplete.set(section.node.id, section.isComplete);
			}
		},
		{ deep: true },
	);

	// ── Hover tracking ──────────────────────────────────────────────────

	const hoveredSection = ref<NodeSetupState | null>(null);

	function onSectionMouseEnter(section: NodeSetupState) {
		hoveredSection.value = section;
	}

	function onSectionMouseLeave() {
		hoveredSection.value = null;
	}

	// ── Node type lookup ────────────────────────────────────────────────

	function getSectionNodeType(section: NodeSetupState) {
		return nodeTypesStore.getNodeType(section.node.type, section.node.typeVersion);
	}

	return {
		parentNodeType,
		subnodeSections,
		allSections,
		getStickyParameters,
		addStickyParameters,
		expandedSections,
		toggleSection,
		hoveredSection,
		onSectionMouseEnter,
		onSectionMouseLeave,
		getSectionNodeType,
	};
}
