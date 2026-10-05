import {
	partitionValidationIssues,
	toEngineConnections,
	type IssueSeverity,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	formatTopLevelItemsMessage,
	NodeConnectionTypes,
	outermostGroups,
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
/** Refusal, node contracts: the save dropped a region, so its nodes would not repeat. */
export const REGION_DROPPED_CODE = 'REGION_DROPPED';

/** How a `@n8n/workflow-sdk/next` source frames a stage as a node group. */
const NEXT_GROUP_CALL = '`group({ name, description }, steps(…))`';
/** The usual invalid group ends on the open paths of a branch, so the hint names the join step. */
const NEXT_GROUP_BOUNDARY =
	'A group has one entry and one exit: the paths of a `when` or `switchOn` join at the next step, so put that step in the same group or end the group before the branch.';

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
	parameterPath?: string;
	/** Set at the creation site; `informational` never blocks save. */
	severity?: IssueSeverity;
}

export function collectValidationIssues(
	issues: Array<{
		code: string;
		message: string;
		nodeName?: string;
		parameterPath?: string;
		parameterName?: string;
		severity?: IssueSeverity;
	}>,
	allWarnings: ValidationWarning[],
): void {
	for (const issue of issues) {
		allWarnings.push({
			code: issue.code,
			message: issue.message,
			nodeName: issue.nodeName,
			parameterPath: issue.parameterPath ?? issue.parameterName,
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

/** The nodes of one `loop`, `paginate` or `pollUntil` of `@n8n/workflow-sdk/next`, by ID. */
export interface ContractLoop {
	readonly headId: string;
	/** The head, the body and the nodes that the macro adds. */
	readonly nodeIds: readonly string[];
}

/** The loops in `json`. The author writes each one as one part, so it counts as one box. */
export async function contractLoopsOf(json: WorkflowJSON): Promise<ContractLoop[]> {
	const { LOOP_STATE_NODE, loopNodeNames } = await import('@n8n/workflow-sdk/next');
	const nodes = json.nodes ?? [];
	const idOf = new Map(
		nodes.flatMap(
			(node): Array<[string, string]> => (node.name && node.id ? [[node.name, node.id]] : []),
		),
	);
	const edges = Object.entries(toEngineConnections(json.connections)).flatMap(([from, byType]) =>
		(byType[NodeConnectionTypes.Main] ?? []).flatMap((targets) =>
			(targets ?? []).map((target) => ({ from, to: target.node })),
		),
	);
	const reach = (start: string, stop: string, step: (name: string) => string[]) => {
		const seen = new Set<string>();
		const visit = (name: string): void => {
			if (seen.has(name)) return;
			seen.add(name);
			if (name !== stop) step(name).forEach(visit);
		};
		visit(start);
		return seen;
	};
	const after = (name: string) => edges.filter((edge) => edge.from === name).map(({ to }) => to);
	const before = (name: string) => edges.filter((edge) => edge.to === name).map(({ from }) => from);

	const loops = nodes.flatMap((head) => {
		const headId = head.id;
		if (head.type !== LOOP_STATE_NODE.type || !head.name || !headId) return [];
		const parts = loopNodeNames(head.name);
		if (!idOf.has(parts.check)) return [];
		// The body is every node on a path from the head to the check.
		const fromHead = reach(head.name, parts.check, after);
		const toCheck = reach(parts.check, head.name, before);
		const names = [
			...[...fromHead].filter((name) => toCheck.has(name)),
			parts.next,
			parts.limit,
			parts.wait,
		];
		return [{ headId, nodeIds: names.flatMap((name) => idOf.get(name) ?? []) }];
	});
	// A loop in the body holds nodes off that path, e.g. its limit node.
	const withInner = (loop: ContractLoop): string[] => [
		...loop.nodeIds,
		...loops
			.filter((inner) => inner !== loop && loop.nodeIds.includes(inner.headId))
			.flatMap(withInner),
	];
	return loops.map((loop) => ({ ...loop, nodeIds: [...new Set(withInner(loop))] }));
}

/**
 * Boxes on the canvas with every group collapsed, for the saved shape of a build.
 * Each loop that no group or other loop holds counts as one box too.
 */
export function summarizeWorkflowTopLevelItems(
	json: WorkflowJSON,
	loops: readonly ContractLoop[] = [],
): TopLevelItemsSummary {
	const nodes = json.nodes ?? [];
	const connectionsBySourceNode = toEngineConnections(json.connections);
	if (loops.length === 0) {
		return summarizeTopLevelItems({ nodes, nodeGroups: json.nodeGroups, connectionsBySourceNode });
	}

	const groups = json.nodeGroups ?? [];
	const groupedIds = new Set(groups.flatMap((group) => group.nodeIds));
	const outerLoops = loops.filter(
		(loop) =>
			!groupedIds.has(loop.headId) &&
			!loops.some((other) => other !== loop && other.nodeIds.includes(loop.headId)),
	);
	const groupsOutsideLoops = groups.filter(
		(group) => !outerLoops.some((loop) => group.nodeIds.every((id) => loop.nodeIds.includes(id))),
	);
	const summary = summarizeTopLevelItems({
		nodes,
		nodeGroups: [
			...groupsOutsideLoops,
			...outerLoops.map((loop) => ({ nodeIds: [...loop.nodeIds] })),
		],
		connectionsBySourceNode,
	});
	return { ...summary, groupCount: outermostGroups(groups).length };
}

/**
 * Warns when the collapsed canvas has more boxes than TOP_LEVEL_ITEM_CEILING. The
 * count lives in n8n-workflow so the MCP tools report the same number.
 */
export function topLevelItemsWarning(
	json: WorkflowJSON,
	summary: TopLevelItemsSummary = summarizeWorkflowTopLevelItems(json),
	nextSource = false,
): ValidationWarning | undefined {
	if (!summary.overCeiling) {
		return;
	}

	return {
		code: TOP_LEVEL_ITEMS_OVER_CEILING_CODE,
		severity: 'informational',
		message: nextSource
			? `${formatTopLevelItemsMessage(summary)} Frame a stage with ${NEXT_GROUP_CALL}. Each loop counts as one box.`
			: formatTopLevelItemsMessage(summary),
	};
}

/**
 * Node contracts: refuses a save that drops a region, on any canvas. Without its region the
 * nodes run once for all items, so the batches and the pauses between them are lost.
 */
export function regionDroppedBlocker(
	droppedRegionViolations: WorkflowGroupViolation[],
): ValidationWarning | undefined {
	const reasons = nodeGroupDroppedWarnings(droppedRegionViolations).map(({ message }) => message);
	if (reasons.length === 0) return;
	return {
		code: REGION_DROPPED_CODE,
		severity: 'error',
		message:
			`The save would remove ${reasons.length} forEach region(s), so their nodes would not run batch by batch. ` +
			`${reasons.join(' ')} Fix what each message names and build again.`,
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
	/** The source imports `@n8n/workflow-sdk/next`, which frames a stage with `group()`. */
	nextSource?: boolean;
}): ValidationWarning | undefined {
	const { summary, declaredGroupCount, droppedGroupWarnings, groupingDecision, nextSource } = input;

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
				`${reasons} Fix the boundary each message names and build again; do not remove the groups.` +
				(nextSource ? ` ${NEXT_GROUP_BOUNDARY}` : ''),
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
			(nextSource
				? `Wrap each stage in ${NEXT_GROUP_CALL} and build again. Each loop counts as one box. ${NEXT_GROUP_BOUNDARY} `
				: 'Wrap each stage in `.group(name, members, { description })` and build again. ') +
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
