import {
	checkEngineV2Eligibility,
	NODE_TYPE_DENYLIST,
	type EngineV2EligibilityWorkflow,
} from '@n8n/workflow-engine-check';

import { ENGINE_V2_NODE_SETTING_RULES } from '../../validation/engine-v2-support';

/**
 * Workflow-level limits that the node lists do not show. Each probe is a small workflow
 * that has the limit. A limit goes into the prompt only while the engine check blocks
 * its probe, so the text drops a limit when engine v2 supports it.
 */
const LIMIT_PROBES: Array<{ text: string; workflow: EngineV2EligibilityWorkflow }> = [
	{
		text: 'community and custom nodes',
		workflow: probeWorkflow({ type: 'n8n-nodes-community-probe.probe' }),
	},
	{
		text: 'error workflows (`errorWorkflow` in the workflow settings)',
		workflow: { ...probeWorkflow(), settings: { errorWorkflow: 'probe-error-workflow' } },
	},
	{
		text: 'the Merge mode "Choose Branch"',
		workflow: probeWorkflow({
			type: 'n8n-nodes-base.merge',
			typeVersion: 3,
			parameters: { mode: 'chooseBranch' },
		}),
	},
];

function probeWorkflow(
	node: { type: string; typeVersion?: number; parameters?: Record<string, string> } = {
		type: 'n8n-nodes-base.noOp',
	},
): EngineV2EligibilityWorkflow {
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
				id: 'probe-node',
				name: 'Probe',
				type: node.type,
				typeVersion: node.typeVersion ?? 1,
				position: [200, 0],
				parameters: node.parameters ?? {},
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

function joinList(items: string[]): string {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

let cachedRules: string | undefined;

/**
 * Rules for workflow code that runs on engine v2. The lists come from
 * `@n8n/workflow-engine-check`, and the node setting lines use the same text as the
 * `ENGINE_V2_*` validation errors, so the rules change when engine v2 gets a feature.
 */
export function getEngineV2BuildRules(): string {
	cachedRules ??= buildEngineV2BuildRules();
	return cachedRules;
}

function buildEngineV2BuildRules(): string {
	const lines: string[] = [];

	const nodeTypes = unsupportedNodeTypes();
	if (nodeTypes.length > 0) {
		lines.push(`- Engine v2 does not run these nodes yet: ${joinList(nodeTypes)}.`);
	}

	const limits = LIMIT_PROBES.filter((probe) => isBlocked(probe.workflow)).map(
		(probe) => probe.text,
	);
	if (limits.length > 0) {
		lines.push(`- Engine v2 does not support ${joinList(limits)} yet.`);
	}

	const settingLines = Object.values(ENGINE_V2_NODE_SETTING_RULES).map(
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
