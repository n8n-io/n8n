import {
	partitionValidationIssues,
	type IssueSeverity,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	isTriggerNodeType,
	STICKY_NODE_TYPE,
	TOP_LEVEL_ITEM_CEILING,
	type WorkflowGroupViolation,
} from 'n8n-workflow';

export const NODE_GROUP_DROPPED_CODE = 'NODE_GROUP_DROPPED';
export const TOP_LEVEL_ITEMS_CODE = 'TOP_LEVEL_ITEMS_OVER_CEILING';

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

/**
 * Counts the boxes on the canvas with every group collapsed, and warns when there are
 * more than the TOP_LEVEL_ITEM_CEILING ceiling. Sub-nodes and sticky notes don't count:
 * a sub-node rides with its parent, and a sticky belongs to the user.
 */
export function topLevelItemsWarning(json: WorkflowJSON): ValidationWarning | undefined {
	const groups = json.nodeGroups ?? [];
	const groupedNodeIds = new Set(groups.flatMap((group) => group.nodeIds));
	const subNodeNames = new Set(
		Object.entries(json.connections ?? {}).flatMap(([nodeName, connectionsByType]) => {
			const types = Object.keys(connectionsByType);
			return types.length > 0 && types.every((type) => type !== 'main') ? [nodeName] : [];
		}),
	);

	const ungrouped = (json.nodes ?? []).filter(
		(node) =>
			!groupedNodeIds.has(node.id) &&
			node.type !== STICKY_NODE_TYPE &&
			!(node.name !== undefined && subNodeNames.has(node.name)),
	);

	const total = groups.length + ungrouped.length;
	if (total <= TOP_LEVEL_ITEM_CEILING) {
		return;
	}

	const groupable = ungrouped
		.filter((node) => !isTriggerNodeType(node.type))
		.map((node) => node.name ?? node.id);

	return {
		code: TOP_LEVEL_ITEMS_CODE,
		severity: 'informational',
		message:
			`The canvas top level has ${total} boxes with every group collapsed, over the ${TOP_LEVEL_ITEM_CEILING} you should aim for` +
			(groupable.length > 0 ? `. Still ungrouped: ${groupable.join(', ')}` : '') +
			'. Group any stage that can form a valid group and build again, or say why each of them cannot join one.',
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
