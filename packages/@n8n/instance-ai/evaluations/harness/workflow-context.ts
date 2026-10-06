import type { WorkflowGroupRepeat } from 'n8n-workflow';

import type { WorkflowResponse } from '../clients/n8n-client';

// Judges read a group as a canvas frame unless told otherwise. The note shows only
// with a `repeat` group, so the context of other workflows does not change.
const REPEAT_GROUP_NOTE =
	'A group with `repeat` is a loop, not only a visual frame. With `kind: "forEach"`, the engine runs the nodes of the group once for each batch of at most `batchSize` items that arrive at `entry`. The batches run one after the other, so a Wait node in the group pauses once for each batch. The items of all batches leave the group one time, on `exits`, after the last batch.';

/** The settings of a `repeat`, e.g. `kind` and `batchSize`, without its node ids. */
const settingsOf = ({ entry: _entry, exits: _exits, ...settings }: WorkflowGroupRepeat) => settings;

/**
 * Renders node groups for the judge. Groups persist member node *ids*, but the
 * judge context is name-keyed and never exposes ids — so members and the `repeat`
 * entry and exits are mapped to node names and stale ids are dropped, mirroring the
 * MCP read path (`toNodeGroupSummary` in packages/cli/src/modules/mcp/tools/schemas.ts).
 */
function renderNodeGroupLines(wf: WorkflowResponse): string[] {
	const groups = wf.nodeGroups ?? [];
	if (groups.length === 0) {
		// Stated absence, not omission — a negative assertion ("the nodes are not
		// grouped") needs the judge to see that no groups exist.
		return ['**Node groups:**', '', '(none)'];
	}
	const nameById = new Map(
		wf.nodes.flatMap((node) => (node.id === undefined ? [] : [[node.id, node.name] as const])),
	);
	return [
		'**Node groups:**',
		'```json',
		JSON.stringify(
			groups.map((group) => ({
				name: group.name,
				nodes: group.nodeIds.flatMap((nodeId) => nameById.get(nodeId) ?? []),
				...(group.description !== undefined ? { description: group.description } : {}),
				...(group.repeat !== undefined
					? {
							repeat: {
								...settingsOf(group.repeat),
								entry: nameById.get(group.repeat.entry),
								exits: group.repeat.exits.flatMap(({ node, output }) => {
									const name = nameById.get(node);
									return name === undefined ? [] : [{ node: name, output }];
								}),
							},
						}
					: {}),
			})),
			null,
			2,
		),
		'```',
		...(groups.some((group) => group.repeat !== undefined) ? ['', REPEAT_GROUP_NOTE] : []),
	];
}

/** Render the per-build workflow structure: nodes, connections, all configs, node groups. */
export function buildWorkflowContextBlock(wf: WorkflowResponse | undefined): string {
	if (!wf) return '## Workflow structure\n\n(no workflow built)';
	const lines: string[] = ['## Workflow structure', ''];
	for (const node of wf.nodes) {
		lines.push(`- **${node.name ?? '(unnamed)'}** (${node.type})`);
	}
	lines.push('');
	lines.push('**All node configs:**');
	lines.push(
		'```json',
		JSON.stringify(
			wf.nodes.map((node) => ({
				name: node.name ?? '(unnamed)',
				type: node.type,
				typeVersion: node.typeVersion,
				...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
				...(node.onError !== undefined ? { onError: node.onError } : {}),
				// Node-level behavior flags — preservation-style expectations assert on
				// these, so omitting them makes the judge read a correct build as a fail.
				...(node.alwaysOutputData !== undefined ? { alwaysOutputData: node.alwaysOutputData } : {}),
				...(node.retryOnFail !== undefined ? { retryOnFail: node.retryOnFail } : {}),
				...(node.maxTries !== undefined ? { maxTries: node.maxTries } : {}),
				...(node.waitBetweenTries !== undefined ? { waitBetweenTries: node.waitBetweenTries } : {}),
				...(node.executeOnce !== undefined ? { executeOnce: node.executeOnce } : {}),
				...(node.credentials !== undefined ? { credentials: node.credentials } : {}),
				parameters: node.parameters ?? {},
			})),
			null,
			2,
		),
		'```',
		'',
	);
	lines.push('**Connections:**');
	lines.push('```json', JSON.stringify(wf.connections, null, 2), '```', '');
	lines.push(...renderNodeGroupLines(wf));
	return lines.join('\n');
}
