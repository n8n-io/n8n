import {
	partitionValidationIssues,
	toEngineConnections,
	type IssueSeverity,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	formatTopLevelItemsMessage,
	summarizeTopLevelItems,
	TOP_LEVEL_ITEMS_OVER_CEILING_CODE,
	type TopLevelItemsSummary,
	type WorkflowGroupViolation,
} from 'n8n-workflow';

/** Informational: a declared group was invalid and the save removed it. */
export const NODE_GROUP_DROPPED_CODE = 'NODE_GROUP_DROPPED';
/** Refusal: the canvas is over the ceiling, has no group, and the agent gave no reason. */
export const GROUPING_DECISION_MISSING_CODE = 'GROUPING_DECISION_MISSING';
/** Refusal: the canvas is over the ceiling and the save dropped a group the agent declared. */
export const GROUP_DROPPED_OVER_CEILING_CODE = 'GROUP_DROPPED_OVER_CEILING';

/**
 * What the agent tells build-workflow about groups.
 * `grouped`: the source declares groups.
 * `not_warranted`: no group is needed, and a reason is given.
 */
export type GroupingDecision = 'grouped' | 'not_warranted';

export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
	/** Set at the creation site; `informational` never blocks save. */
	severity?: IssueSeverity;
}

export function collectValidationIssues(
	issues: Array<{
		code: string;
		message: string;
		nodeName?: string;
		severity?: IssueSeverity;
	}>,
	allWarnings: ValidationWarning[],
): void {
	for (const issue of issues) {
		allWarnings.push({
			code: issue.code,
			message: issue.message,
			nodeName: issue.nodeName,
			severity: issue.severity,
		});
	}
}

export function partitionWarnings(warnings: ValidationWarning[]): {
	blocking: ValidationWarning[];
	informational: ValidationWarning[];
} {
	// Severity is set where each issue is created (SDK validators / lint /
	// Instance AI host detectors). CLI validate and this save gate share
	// {@link partitionValidationIssues}.
	return partitionValidationIssues(warnings);
}

/** Boxes on the canvas with every group collapsed, for the saved shape of a build. */
export function summarizeWorkflowTopLevelItems(json: WorkflowJSON): TopLevelItemsSummary {
	return summarizeTopLevelItems({
		nodes: json.nodes ?? [],
		nodeGroups: json.nodeGroups,
		connectionsBySourceNode: toEngineConnections(json.connections),
	});
}

/**
 * Warns when the collapsed canvas has more boxes than TOP_LEVEL_ITEM_CEILING. The
 * count lives in n8n-workflow so the MCP tools report the same number.
 */
export function topLevelItemsWarning(
	json: WorkflowJSON,
	summary: TopLevelItemsSummary = summarizeWorkflowTopLevelItems(json),
): ValidationWarning | undefined {
	if (!summary.overCeiling) {
		return;
	}

	return {
		code: TOP_LEVEL_ITEMS_OVER_CEILING_CODE,
		severity: 'informational',
		message: formatTopLevelItemsMessage(summary),
	};
}

/**
 * The check that blocks a save. Over the ceiling, a dropped group refuses the build
 * until its boundary is fixed — the agent had already decided to group, and an opt-out
 * never excuses that. A canvas with no group refuses it until the agent groups or
 * states why it cannot.
 */
export function groupingDecisionBlocker(input: {
	summary: TopLevelItemsSummary;
	declaredGroupCount: number;
	droppedGroupWarnings: ValidationWarning[];
	groupingDecision?: GroupingDecision;
}): ValidationWarning | undefined {
	const { summary, declaredGroupCount, droppedGroupWarnings, groupingDecision } = input;

	if (!summary.overCeiling) {
		return;
	}

	// Over the ceiling and the save dropped a group: the agent must repair it, not ship past it.
	if (droppedGroupWarnings.length > 0) {
		const reasons = droppedGroupWarnings.map((warning) => warning.message).join(' ');
		return {
			code: GROUP_DROPPED_OVER_CEILING_CODE,
			severity: 'warning',
			message:
				`${droppedGroupWarnings.length} of ${declaredGroupCount} declared node group(s) were removed, ` +
				`so the canvas would have ${summary.total} boxes. ` +
				`${reasons} Fix the boundary each message names and build again; do not remove the groups.`,
		};
	}

	if (summary.groupCount > 0) {
		return;
	}

	if (groupingDecision === 'not_warranted') {
		return;
	}

	return {
		code: GROUPING_DECISION_MISSING_CODE,
		severity: 'warning',
		message:
			`The canvas would have ${summary.total} boxes with every group collapsed and no node group. ` +
			`Ungrouped: ${summary.groupableNodeNames.join(', ')}. ` +
			'Wrap each stage in `.group(name, members, { description })` and build again. ' +
			"If no valid group can hold these nodes, call build-workflow again with `groupingDecision: 'not_warranted'` " +
			'and a `groupingReason` that says why.',
	};
}

export function nodeGroupDroppedWarnings(
	violations: WorkflowGroupViolation[],
): ValidationWarning[] {
	const violationsByGroup = new Map<string, WorkflowGroupViolation[]>();
	for (const violation of violations) {
		const key = JSON.stringify([violation.groupId, violation.groupName]);
		const groupViolations = violationsByGroup.get(key);
		if (groupViolations) {
			groupViolations.push(violation);
		} else {
			violationsByGroup.set(key, [violation]);
		}
	}

	const warnings: ValidationWarning[] = [];
	for (const groupViolations of violationsByGroup.values()) {
		const firstViolation = groupViolations[0];
		if (!firstViolation) continue;
		const messages = groupViolations.map(({ message }) => message);
		warnings.push(formatNodeGroupDroppedWarning(firstViolation.groupName, messages));
	}
	return warnings;
}

function formatNodeGroupDroppedWarning(groupName: string, messages: string[]): ValidationWarning {
	return {
		code: NODE_GROUP_DROPPED_CODE,
		severity: 'informational',
		message: `Node group "${groupName}" was removed from the saved workflow: ${messages.join(' ')}`,
	};
}
