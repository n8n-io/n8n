import { computed, reactive, ref, watch, type Ref } from 'vue';
import type { INodeProperties } from 'n8n-workflow';

import type { AgentGroupItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

/**
 * Returns true when a section has required parameters (issues or additional parameter names).
 * Sections with parameters stay expanded so the user isn't interrupted mid-input.
 */
export const sectionHasParameters = (section: NodeSetupState) =>
	Object.keys(section.parameterIssues).length > 0 ||
	(section.additionalParameterNames?.length ?? 0) > 0;

/**
 * Shared composable for agent-group section management.
 * Used by both `BuilderAgentGroupCard` (wizard) and `AgentGroupSetupCard` (panel).
 */
export function useAgentGroupSections(agentGroup: Ref<AgentGroupItem>) {
	const nodeTypesStore = useNodeTypesStore();

	// ── Computed sections ───────────────────────────────────────────────

	const agentNodeType = computed(() =>
		nodeTypesStore.getNodeType(
			agentGroup.value.agentNode.type,
			agentGroup.value.agentNode.typeVersion,
		),
	);

	const subnodeSections = computed<NodeSetupState[]>(() => agentGroup.value.subnodeCards);

	/** All sections including agent state — used for completion tracking */
	const allSections = computed<NodeSetupState[]>(() => {
		const sections: NodeSetupState[] = [];
		if (agentGroup.value.agentState) sections.push(agentGroup.value.agentState);
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
		agentNodeType,
		subnodeSections,
		allSections,
		stickyParametersMap,
		getStickyParameters,
		expandedSections,
		toggleSection,
		hoveredSection,
		onSectionMouseEnter,
		onSectionMouseLeave,
		getSectionNodeType,
	};
}
