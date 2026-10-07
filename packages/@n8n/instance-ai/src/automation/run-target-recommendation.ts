export type RunTargetOption = {
	id: string;
	kind: 'local' | 'linked';
	label: string;
	status: 'online' | 'offline' | 'unauthorised' | 'unknown';
};

export type RecommendationReason =
	/** The workflow reads or writes files on this computer. */
	| 'needs-local-files'
	/** The workflow runs commands on this computer. */
	| 'needs-local-commands'
	/** The workflow watches files on this computer. */
	| 'needs-local-trigger'
	/** A schedule, webhook, form or app trigger starts the workflow. */
	| 'always-on-trigger'
	/** A cloud target exists, but no cloud target is online. */
	| 'cloud-offline'
	/** There is no linked cloud target. */
	| 'no-cloud-linked'
	/** No node needs a specific place to run. */
	| 'manual-only';

export type RunTargetRecommendation = {
	/** When there is no local target, the first target stands in for it. */
	targetId: string;
	/** Where the workflow should run. */
	kind: 'local' | 'linked';
	/** Never empty. */
	reasons: RecommendationReason[];
};

/** Node types that work only on the computer that runs n8n. */
export const LOCAL_ONLY_NODE_TYPES: Readonly<Record<string, RecommendationReason>> = Object.freeze({
	'n8n-nodes-base.readWriteFile': 'needs-local-files',
	'n8n-nodes-base.readBinaryFile': 'needs-local-files',
	'n8n-nodes-base.readBinaryFiles': 'needs-local-files',
	'n8n-nodes-base.writeBinaryFile': 'needs-local-files',
	'n8n-nodes-base.executeCommand': 'needs-local-commands',
	'n8n-nodes-base.localFileTrigger': 'needs-local-trigger',
});

/** Always-on triggers whose type does not end in "Trigger". */
const ALWAYS_ON_LEGACY_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.webhook',
]);

/** These triggers start only from n8n itself or from this computer, so they need no uptime. */
const NOT_ALWAYS_ON_TRIGGERS: ReadonlySet<string> = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.localFileTrigger',
]);

const ALWAYS_ON_REASON: RecommendationReason = 'always-on-trigger';

/** Uses an own-property check, so that names such as "constructor" do not match. */
function localOnlyReason(nodeType: string): RecommendationReason | undefined {
	return Object.hasOwn(LOCAL_ONLY_NODE_TYPES, nodeType)
		? LOCAL_ONLY_NODE_TYPES[nodeType]
		: undefined;
}

/** Unique reasons, in the order that their nodes first occur. */
function collectLocalOnlyReasons(nodeTypes: readonly string[]): RecommendationReason[] {
	const reasons = new Set<RecommendationReason>();
	for (const nodeType of nodeTypes) {
		const reason = localOnlyReason(nodeType);
		if (reason) reasons.add(reason);
	}
	return [...reasons];
}

/** True when the trigger must keep running while this computer sleeps. */
export function isAlwaysOnTrigger(nodeType: string): boolean {
	if (ALWAYS_ON_LEGACY_TYPES.has(nodeType)) return true;
	return nodeType.endsWith('Trigger') && !NOT_ALWAYS_ON_TRIGGERS.has(nodeType);
}

function recommendForAlwaysOn(
	targets: readonly RunTargetOption[],
	local: RunTargetOption,
): RunTargetRecommendation {
	const linked = targets.filter((target) => target.kind === 'linked');
	const online = linked.find((target) => target.status === 'online');
	if (online) return { targetId: online.id, kind: 'linked', reasons: [ALWAYS_ON_REASON] };
	const missing: RecommendationReason = linked.length > 0 ? 'cloud-offline' : 'no-cloud-linked';
	return { targetId: local.id, kind: 'local', reasons: [ALWAYS_ON_REASON, missing] };
}

/**
 * Recommends where a workflow should run, with reasons that the user can read.
 * Local-only nodes win over always-on triggers, because a cloud target cannot
 * reach the files or commands of this computer. Never throws.
 */
export function recommendRunTarget(input: {
	nodeTypes: readonly string[];
	targets: readonly RunTargetOption[];
}): RunTargetRecommendation {
	const { nodeTypes, targets } = input;
	const local = targets.find((target) => target.kind === 'local') ?? targets.at(0);
	if (!local) return { targetId: 'local', kind: 'local', reasons: ['no-cloud-linked'] };

	const localReasons = collectLocalOnlyReasons(nodeTypes);
	if (localReasons.length > 0) return { targetId: local.id, kind: 'local', reasons: localReasons };

	if (nodeTypes.some((nodeType) => isAlwaysOnTrigger(nodeType))) {
		return recommendForAlwaysOn(targets, local);
	}
	return { targetId: local.id, kind: 'local', reasons: ['manual-only'] };
}
