import { isRecord } from '@n8n/utils/is-record';
import {
	CODE_LANGCHAIN_NODE_TYPE,
	CODE_NODE_TYPE,
	CODE_TOOL_LANGCHAIN_NODE_TYPE,
	EXECUTE_WORKFLOW_NODE_TYPE,
	FORM_NODE_TYPE,
	FUNCTION_ITEM_NODE_TYPE,
	FUNCTION_NODE_TYPE,
	MERGE_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
	STICKY_NODE_TYPE,
	WAIT_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
} from 'n8n-workflow';

import type { WorkflowDesign } from '../aquarium.types';

const IF_NODE_TYPE = 'n8n-nodes-base.if';
const SWITCH_NODE_TYPE = 'n8n-nodes-base.switch';

const CODE_TYPES = new Set([
	CODE_NODE_TYPE,
	FUNCTION_NODE_TYPE,
	FUNCTION_ITEM_NODE_TYPE,
	CODE_LANGCHAIN_NODE_TYPE,
	CODE_TOOL_LANGCHAIN_NODE_TYPE,
]);
const BRANCH_TYPES = new Set([IF_NODE_TYPE, SWITCH_NODE_TYPE, MERGE_NODE_TYPE]);
const SUB_WORKFLOW_TYPES = new Set([EXECUTE_WORKFLOW_NODE_TYPE, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE]);
const WAIT_TYPES = new Set([WAIT_NODE_TYPE, FORM_NODE_TYPE]);

/** The parts of a node that the analysis reads. Parameters are only compared, never kept. */
export interface AnalyzedNode {
	type: string;
	disabled?: boolean;
	parameters?: unknown;
}

/** `DEFAULT` and an empty value mean that the instance default applies: no workflow is set. */
export function hasErrorWorkflowSetting(settings: unknown): boolean {
	if (!isRecord(settings)) return false;
	const value = settings.errorWorkflow;
	return typeof value === 'string' && value !== '' && value !== 'DEFAULT';
}

/** Reads the build of a workflow from its nodes and settings. Sticky notes do not count. */
export function analyzeWorkflow(nodes: AnalyzedNode[], settings?: unknown): WorkflowDesign {
	const real = nodes.filter((node) => node.type !== STICKY_NODE_TYPE);
	const seen = new Set<string>();
	let duplicateNodeCount = 0;

	for (const node of real) {
		// A node with no parameters, like No Op, is the same as every other one by design.
		if (!isRecord(node.parameters) || Object.keys(node.parameters).length === 0) continue;
		const fingerprint = `${node.type}:${JSON.stringify(node.parameters)}`;
		if (seen.has(fingerprint)) duplicateNodeCount++;
		else seen.add(fingerprint);
	}

	return {
		nodeCount: real.length,
		codeNodeCount: real.filter((node) => CODE_TYPES.has(node.type)).length,
		branchNodeCount: real.filter((node) => BRANCH_TYPES.has(node.type)).length,
		disabledNodeCount: real.filter((node) => node.disabled === true).length,
		duplicateNodeCount,
		subWorkflowCallCount: real.filter((node) => SUB_WORKFLOW_TYPES.has(node.type)).length,
		waitNodeCount: real.filter(
			(node) =>
				WAIT_TYPES.has(node.type) ||
				(isRecord(node.parameters) && node.parameters.operation === SEND_AND_WAIT_OPERATION),
		).length,
		hasErrorWorkflow: hasErrorWorkflowSetting(settings),
	};
}

export type MaintainabilityFactorId = 'size' | 'code' | 'duplicates' | 'disabled' | 'branching';

export interface MaintainabilityFactor {
	id: MaintainabilityFactorId;
	/** Points taken off the score. */
	penalty: number;
	/** What the penalty is for, for example the number of Code nodes. */
	count: number;
}

export interface MaintainabilityReport {
	/** 100 is easy to maintain, 0 is hard. */
	score: number;
	/** Only the factors that cost points, biggest first. */
	factors: MaintainabilityFactor[];
}

/** Each rule: what it counts, how many are fine, points for each one more, and the most points. */
export const MAINTAINABILITY_RULES: Record<
	MaintainabilityFactorId,
	{ free: number; perItem: number; max: number }
> = {
	/** Nodes in a workflow that calls no sub-workflow. */
	size: { free: 20, perItem: 1, max: 25 },
	code: { free: 1, perItem: 4, max: 20 },
	duplicates: { free: 0, perItem: 5, max: 20 },
	disabled: { free: 0, perItem: 3, max: 15 },
	branching: { free: 3, perItem: 2, max: 20 },
};

export function maintainabilityOf(design: WorkflowDesign): MaintainabilityReport {
	const counts: Record<MaintainabilityFactorId, number> = {
		size: design.subWorkflowCallCount > 0 ? 0 : design.nodeCount,
		code: design.codeNodeCount,
		duplicates: design.duplicateNodeCount,
		disabled: design.disabledNodeCount,
		branching: design.branchNodeCount,
	};

	const factors = Object.entries(MAINTAINABILITY_RULES)
		.flatMap(([id, rule]) => {
			if (!isFactorId(id)) return [];
			const count = counts[id];
			const penalty = Math.min(rule.max, Math.max(0, count - rule.free) * rule.perItem);
			return penalty > 0 ? [{ id, penalty, count }] : [];
		})
		.sort((a, b) => b.penalty - a.penalty);

	const score = Math.max(0, 100 - factors.reduce((sum, factor) => sum + factor.penalty, 0));
	return { score, factors };
}

function isFactorId(id: string): id is MaintainabilityFactorId {
	return id in MAINTAINABILITY_RULES;
}
