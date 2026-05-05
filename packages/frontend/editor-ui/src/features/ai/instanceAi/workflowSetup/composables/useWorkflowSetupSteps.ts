import { computed, type ComputedRef, type Ref } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type {
	WorkflowSetupGroup,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';

type ParentMeta = WorkflowSetupGroup['parentNode'];

interface GroupBuild {
	parentNode: ParentMeta;
	parentSection?: WorkflowSetupSection;
	subnodeSections: WorkflowSetupSection[];
	firstClaimedIndex: number;
}

/**
 * Combines flat sections with parent-stamp metadata from setup requests to
 * produce a list of wizard steps. Sections that share a `groupRoot` (an
 * agent / parent node) are folded into a single `{ group }` step with an
 * optional `parentSection` and a `subnodeSections` array.
 *
 * Two-pass algorithm guarantees the group is emitted exactly once at the
 * earliest position any of its sections occupies in the input.
 */
export function useWorkflowSetupSteps(deps: {
	sections: ComputedRef<WorkflowSetupSection[]>;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>;
}): { steps: ComputedRef<WorkflowSetupStep[]> } {
	const steps = computed<WorkflowSetupStep[]>(() => {
		const sections = deps.sections.value;
		const requests = deps.setupRequests.value;
		if (sections.length === 0) return [];

		// ── Build lookup tables from setup requests ──────────────────────
		// `parentBySubnodeName`: subnode → its stamped root parent metadata
		// `parentMetaByName`: parentName → stamped metadata for any node that
		//   has children (covers parents that have no setup request of their own
		//   AND parents that do have a section).
		const parentBySubnodeName = new Map<string, ParentMeta>();
		const parentMetaByName = new Map<string, ParentMeta>();
		for (const req of requests) {
			if (req.parentNode) {
				parentBySubnodeName.set(req.node.name, req.parentNode);
				if (!parentMetaByName.has(req.parentNode.name)) {
					parentMetaByName.set(req.parentNode.name, req.parentNode);
				}
			}
		}

		// ── Pass 1: bucket sections into groups + claim their ids ────────
		const groupsByRoot = new Map<string, GroupBuild>();
		const claimedSectionIds = new Set<string>();

		const ensureGroup = (root: ParentMeta, sectionIndex: number): GroupBuild => {
			let group = groupsByRoot.get(root.name);
			if (!group) {
				group = {
					parentNode: root,
					subnodeSections: [],
					firstClaimedIndex: sectionIndex,
				};
				groupsByRoot.set(root.name, group);
			} else if (sectionIndex < group.firstClaimedIndex) {
				group.firstClaimedIndex = sectionIndex;
			}
			return group;
		};

		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			const stampedParent = parentBySubnodeName.get(section.targetNodeName);
			if (stampedParent) {
				const group = ensureGroup(stampedParent, i);
				group.subnodeSections.push(section);
				claimedSectionIds.add(section.id);
				continue;
			}

			const ownParentMeta = parentMetaByName.get(section.targetNodeName);
			if (ownParentMeta) {
				// "First wins" is defensive: backend currently emits at most one
				// setup request per node, but later duplicates are still claimed
				// by the group and filtered in pass 2.
				const group = ensureGroup(ownParentMeta, i);
				if (!group.parentSection) group.parentSection = section;
				claimedSectionIds.add(section.id);
			}
		}

		if (groupsByRoot.size === 0) {
			return sections.map((section) => ({ section }));
		}

		// ── Pass 2: walk sections and emit steps ──────────────────────────
		// Each group has a unique firstClaimedIndex (one section per index, each
		// section claimed by at most one group), so an index→group lookup is enough.
		const groupByFirstIndex = new Map<number, GroupBuild>();
		for (const group of groupsByRoot.values()) {
			groupByFirstIndex.set(group.firstClaimedIndex, group);
		}

		const result: WorkflowSetupStep[] = [];

		for (let i = 0; i < sections.length; i++) {
			const groupToInsert = groupByFirstIndex.get(i);
			if (groupToInsert) {
				const groupStep: WorkflowSetupGroup = {
					parentNode: groupToInsert.parentNode,
					...(groupToInsert.parentSection ? { parentSection: groupToInsert.parentSection } : {}),
					subnodeSections: groupToInsert.subnodeSections,
				};
				result.push({ group: groupStep });
				continue;
			}

			const section = sections[i];
			if (claimedSectionIds.has(section.id)) continue;
			result.push({ section });
		}

		return result;
	});

	return { steps };
}
