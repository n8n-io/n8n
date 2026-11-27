import {
	engineV2Check,
	type EngineCompatibilityReason,
	type EngineCompatibilityWorkflow,
} from './engineV2Check';

type Severity = EngineCompatibilityReason['severity'];

/**
 * One row of the findings: one node with all of its reasons, or one reason with no node.
 * The number of groups is the count that every surface shows.
 */
export interface EngineV2FindingGroup {
	/** The node id, the node name, or a stable id for a reason with no node. */
	id: string;
	nodeId?: string;
	nodeName?: string;
	/** The worst severity of the reasons. */
	severity: Severity;
	/** Blocking reasons first, then the order of the check. */
	reasons: EngineCompatibilityReason[];
}

function groupKey(reason: EngineCompatibilityReason, index: number): string {
	if (reason.nodeId) return `node:${reason.nodeId}`;
	if (reason.nodeName) return `name:${reason.nodeName}`;
	return `workflow:${index}-${reason.code}`;
}

function isBlocking(reason: EngineCompatibilityReason): boolean {
	return reason.severity === 'blocking';
}

/** Puts the blocking items first, and keeps the order of each part. */
function blockingFirst<T>(items: T[], blocks: (item: T) => boolean): T[] {
	return [...items.filter(blocks), ...items.filter((item) => !blocks(item))];
}

/**
 * Groups the reasons by node (`nodeId`, else `nodeName`). A reason with no node is a group of
 * its own. Blocking groups come first. Each part keeps the order of the check.
 */
export function groupEngineV2Reasons(reasons: EngineCompatibilityReason[]): EngineV2FindingGroup[] {
	const groups = new Map<string, EngineV2FindingGroup>();

	reasons.forEach((reason, index) => {
		const id = groupKey(reason, index);
		const group = groups.get(id);
		if (group) {
			group.reasons.push(reason);
			group.nodeName ??= reason.nodeName;
			if (isBlocking(reason)) group.severity = 'blocking';
			return;
		}
		groups.set(id, {
			id,
			nodeId: reason.nodeId,
			nodeName: reason.nodeName,
			severity: reason.severity,
			reasons: [reason],
		});
	});

	const sorted = [...groups.values()].map((group) => ({
		...group,
		reasons: blockingFirst(group.reasons, isBlocking),
	}));
	return blockingFirst(sorted, (group) => group.severity === 'blocking');
}

/** True when a group blocks publishing. */
export function hasBlockingGroup(groups: EngineV2FindingGroup[]): boolean {
	return groups.some((group) => group.severity === 'blocking');
}

/**
 * Runs the check on any workflow, whatever its engine, and returns the groups. Workflow
 * settings use it to warn before the switch to engine v2. The caller decides if the module is
 * active.
 */
export function findEngineV2Issues(workflow: EngineCompatibilityWorkflow): EngineV2FindingGroup[] {
	return groupEngineV2Reasons(engineV2Check.checkWorkflow(workflow).reasons);
}
