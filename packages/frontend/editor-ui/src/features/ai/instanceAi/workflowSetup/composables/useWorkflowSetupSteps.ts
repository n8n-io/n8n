import { computed, type ComputedRef, type Ref } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type {
	WorkflowSetupGroup,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';

/**
 * Combines flat sections with subnode-root metadata from setup requests to
 * produce a list of wizard steps. Sections that share a root node (an agent)
 * are folded into a single `{ group }` step emitted at the position of the
 * group's earliest section. Ungrouped sections pass through.
 */
export function useWorkflowSetupSteps(deps: {
	sections: ComputedRef<WorkflowSetupSection[]>;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>;
}): { steps: ComputedRef<WorkflowSetupStep[]> } {
	const steps = computed<WorkflowSetupStep[]>(() => {
		const sections = deps.sections.value;
		const requests = deps.setupRequests.value;
		if (sections.length === 0) return [];

		const rootBySubnodeName = new Map<string, WorkflowSetupGroup['subnodeRootNode']>();
		const rootMetaByName = new Map<string, WorkflowSetupGroup['subnodeRootNode']>();
		for (const req of requests) {
			if (!req.subnodeRootNode) continue;
			rootBySubnodeName.set(req.node.name, req.subnodeRootNode);
			if (!rootMetaByName.has(req.subnodeRootNode.name)) {
				rootMetaByName.set(req.subnodeRootNode.name, req.subnodeRootNode);
			}
		}

		const result: WorkflowSetupStep[] = [];
		const groupByRootName = new Map<string, WorkflowSetupGroup>();

		for (const section of sections) {
			const subnodeRoot = rootBySubnodeName.get(section.targetNodeName);
			const selfAsRoot = rootMetaByName.get(section.targetNodeName);
			const root = subnodeRoot ?? selfAsRoot;

			if (!root) {
				result.push({ kind: 'section', section });
				continue;
			}

			let group = groupByRootName.get(root.name);
			if (!group) {
				group = { subnodeRootNode: root, subnodeSections: [] };
				groupByRootName.set(root.name, group);
				result.push({ kind: 'group', group });
			}

			if (subnodeRoot) {
				group.subnodeSections.push(section);
			} else if (!group.rootSection) {
				group.rootSection = section;
			}
		}

		return result;
	});

	return { steps };
}
