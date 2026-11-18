import type { NodeMigration } from '../node-migration';
import { readOptions } from '../parameter-readers';
import { AGENT_NODE_TYPE } from '../../rules/v3/agent-node-mode';

/**
 * AI Agent below version 2 in Tools Agent mode to AI Agent 2.2.
 *
 * Does:
 * - Target: same node type, version 2.2. Version 2 runs the same tool-calling executor.
 *   The rule only flags nodes whose mode still exists, so other modes never get here.
 * - Keeps: every parameter except `agent`, which only selected the mode.
 * - Writes: `options.enableStreaming` = `false`. Versions below 2 never stream, and 2.1
 *   and later stream by default when the trigger streams.
 * - Writes below 1.3: `promptType` = `define` and `hasOutputParser` = `true`. These
 *   versions hide both settings and fall back to these values, and version 2.2 defaults to
 *   the opposite. An unconnected output parser is ignored in both versions.
 *
 * Refuses when:
 * - `options` is not an object.
 * - The node is below 1.3 and has no prompt.
 *
 * Accepted changes:
 * - Below 1.3 the old node also hides `text`, so it fails on every run. The migrated node
 *   runs with the saved prompt.
 */
export const agentToolsV1ToV2: NodeMigration = {
	ruleId: 'agent-node-version-v3',
	migrate: (node) => {
		const { agent: _agent, options: _options, ...parameters } = node.parameters;

		if (node.typeVersion < 1.3) {
			if (!parameters.text) {
				throw new Error(
					'This AI Agent node has no prompt. Enter a prompt or replace it with an AI Agent on the latest version manually before migrating.',
				);
			}
			parameters.promptType = 'define';
			parameters.hasOutputParser = true;
		}

		return {
			node: {
				type: AGENT_NODE_TYPE,
				typeVersion: 2.2,
				parameters: {
					...parameters,
					options: { ...readOptions(node.parameters), enableStreaming: false },
				},
			},
		};
	},
};
