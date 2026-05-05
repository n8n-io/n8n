import { computed, type ComputedRef, type Ref } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type {
	WorkflowSetupGroup,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';

/**
 * Combines flat sections with parent-stamp metadata from setup requests to
 * produce a list of wizard steps. Sections that share a parent node (an
 * agent) are folded into a single `{ group }` step emitted at the position
 * of the group's earliest section. Ungrouped sections pass through.
 */
export function useWorkflowSetupSteps(deps: {
	sections: ComputedRef<WorkflowSetupSection[]>;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>;
}): { steps: ComputedRef<WorkflowSetupStep[]> } {
	const steps = computed<WorkflowSetupStep[]>(() => {
		const sections = deps.sections.value;
		const requests = deps.setupRequests.value;
		if (sections.length === 0) return [];

		const parentBySubnodeName = new Map<string, WorkflowSetupGroup['parentNode']>();
		const parentMetaByName = new Map<string, WorkflowSetupGroup['parentNode']>();
		for (const req of requests) {
			if (!req.parentNode) continue;
			parentBySubnodeName.set(req.node.name, req.parentNode);
			if (!parentMetaByName.has(req.parentNode.name)) {
				parentMetaByName.set(req.parentNode.name, req.parentNode);
			}
		}

		const result: WorkflowSetupStep[] = [];
		const groupByParentName = new Map<string, WorkflowSetupGroup>();

		for (const section of sections) {
			const subnodeParent = parentBySubnodeName.get(section.targetNodeName);
			const selfAsParent = parentMetaByName.get(section.targetNodeName);
			const parent = subnodeParent ?? selfAsParent;

			if (!parent) {
				result.push({ kind: 'section', section });
				continue;
			}

			let group = groupByParentName.get(parent.name);
			if (!group) {
				group = { parentNode: parent, subnodeSections: [] };
				groupByParentName.set(parent.name, group);
				result.push({ kind: 'group', group });
			}

			if (subnodeParent) {
				group.subnodeSections.push(section);
			} else if (!group.parentSection) {
				group.parentSection = section;
			}
		}

		return result;
	});

	return { steps };
}
