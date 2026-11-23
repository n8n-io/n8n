import {
	checkEngineV2Eligibility,
	NODE_TYPE_DENYLIST,
	type EngineV2EligibilityWorkflow,
} from '@n8n/workflow-engine-check';
import type { INode } from 'n8n-workflow';

import {
	ENGINE_V2_NODE_SETTING_RULES,
	isEngineV2NodeSettingCode,
	type EngineV2NodeSettingCode,
	type EngineV2NodeSettingRule,
} from '../../validation/engine-v2-support';

type NodeSettings = Partial<
	Pick<INode, 'executeOnce' | 'alwaysOutputData' | 'retryOnFail' | 'onError'>
>;

type ProbeNode = Pick<INode, 'type'> &
	Partial<Pick<INode, 'typeVersion' | 'parameters'>> &
	NodeSettings;

/**
 * One probe node for each node setting rule. A rule goes into the prompt only while the
 * engine check blocks its probe, so the text drops a rule when engine v2 supports the setting.
 */
const NODE_SETTING_PROBES: Record<EngineV2NodeSettingCode, NodeSettings> = {
	RETRY_ON_FAIL: { retryOnFail: true },
	CONTINUE_ERROR_OUTPUT: { onError: 'continueErrorOutput' },
	EXECUTE_ONCE: { executeOnce: true },
	ALWAYS_OUTPUT_DATA: { alwaysOutputData: true },
};

/**
 * Workflow-level limits that the node lists do not show. Each probe is a small workflow
 * that has the limit. A limit goes into the prompt only while the engine check blocks
 * its probe, so the text drops a limit when engine v2 supports it.
 */
export type EngineV2LimitId = 'community-nodes' | 'error-workflows' | 'merge-choose-branch';

const LIMIT_PROBES: Array<{
	id: EngineV2LimitId;
	text: string;
	workflow: EngineV2EligibilityWorkflow;
}> = [
	{
		id: 'community-nodes',
		text: 'community and custom nodes',
		workflow: probeWorkflow({ type: 'n8n-nodes-community-probe.probe' }),
	},
	{
		id: 'error-workflows',
		text: 'error workflows (`errorWorkflow` in the workflow settings)',
		workflow: { ...probeWorkflow(), settings: { errorWorkflow: 'probe-error-workflow' } },
	},
	{
		id: 'merge-choose-branch',
		text: 'the Merge mode "Choose Branch"',
		workflow: probeWorkflow({
			type: 'n8n-nodes-base.merge',
			typeVersion: 3,
			parameters: { mode: 'chooseBranch' },
		}),
	},
];

function probeWorkflow(
	node: ProbeNode = { type: 'n8n-nodes-base.noOp' },
): EngineV2EligibilityWorkflow {
	const { typeVersion, parameters, ...rest } = node;
	return {
		nodes: [
			{
				id: 'probe-trigger',
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				...rest,
				id: 'probe-node',
				name: 'Probe',
				typeVersion: typeVersion ?? 1,
				position: [200, 0],
				parameters: parameters ?? {},
			},
		],
		connections: { Trigger: { main: [[{ node: 'Probe', type: 'main', index: 0 }]] } },
		settings: {},
	};
}

function isBlocked(workflow: EngineV2EligibilityWorkflow): boolean {
	return checkEngineV2Eligibility(workflow).reasons.some(
		(reason) => reason.severity === 'blocking',
	);
}

/**
 * The node types that engine v2 does not run yet, from the engine check. A package
 * prefix hides the types that it already covers.
 */
function unsupportedNodeTypes(): string[] {
	const prefixes = NODE_TYPE_DENYLIST.filter((entry) => entry.type.endsWith('.')).map(
		(entry) => entry.type,
	);
	const types = NODE_TYPE_DENYLIST.filter(
		(entry) =>
			!entry.type.endsWith('.') && !prefixes.some((prefix) => entry.type.startsWith(prefix)),
	).map((entry) => `\`${entry.type}\``);
	return [
		...new Set(types),
		...prefixes.map((prefix) => `every node whose type starts with \`${prefix}\``),
	];
}

let cachedSettingRules:
	| Partial<Record<EngineV2NodeSettingCode, EngineV2NodeSettingRule>>
	| undefined;

/**
 * The node setting rules that the engine check still blocks. Callers that give the v2
 * way for a setting use this, so the advice stops when engine v2 supports the setting.
 */
export function getBlockedEngineV2NodeSettingRules(): Partial<
	Record<EngineV2NodeSettingCode, EngineV2NodeSettingRule>
> {
	cachedSettingRules ??= Object.fromEntries(
		Object.entries(ENGINE_V2_NODE_SETTING_RULES).filter(
			([code]) =>
				isEngineV2NodeSettingCode(code) &&
				isBlocked(probeWorkflow({ type: 'n8n-nodes-base.noOp', ...NODE_SETTING_PROBES[code] })),
		),
	);
	return cachedSettingRules;
}

let cachedBlockedLimits: ReadonlySet<EngineV2LimitId> | undefined;

/**
 * The workflow-level limits that the engine check still blocks. Callers that change
 * their advice for a limit use this, so the change stops when engine v2 supports it.
 */
export function getBlockedEngineV2Limits(): ReadonlySet<EngineV2LimitId> {
	cachedBlockedLimits ??= new Set(
		LIMIT_PROBES.filter((probe) => isBlocked(probe.workflow)).map((probe) => probe.id),
	);
	return cachedBlockedLimits;
}

let cachedRules: string | undefined;

/**
 * Rules for workflow code that runs on engine v2. Each line comes from
 * `@n8n/workflow-engine-check` (its denylist or a probe), and the node setting lines use
 * the same text as the `ENGINE_V2_*` validation errors. So the rules change when engine
 * v2 gets a feature.
 */
export function getEngineV2BuildRules(): string {
	cachedRules ??= buildEngineV2BuildRules();
	return cachedRules;
}

function buildEngineV2BuildRules(): string {
	const lines: string[] = [];

	const nodeTypes = unsupportedNodeTypes();
	if (nodeTypes.length > 0) {
		lines.push(`- Engine v2 does not run these nodes yet: ${nodeTypes.join(', ')}.`);
	}

	const blockedLimits = getBlockedEngineV2Limits();
	const limits = LIMIT_PROBES.filter((probe) => blockedLimits.has(probe.id)).map(
		(probe) => probe.text,
	);
	if (limits.length > 0) {
		lines.push(`- Engine v2 does not support ${limits.join(', ')} yet.`);
	}

	const settingLines = Object.values(getBlockedEngineV2NodeSettingRules()).map(
		(rule) => `  - ${rule.setting}: ${rule.text}`,
	);
	if (settingLines.length > 0) {
		lines.push(
			"- Engine v2 rejects these node settings. Do not set them, and use the v2 way. The build check returns the same text. `onError: 'continueRegularOutput'` is v2-safe.",
			...settingLines,
		);
	}

	lines.push(
		'- The build checks the workflow against engine v2 and returns each other problem with its fix.',
	);
	return lines.join('\n');
}
