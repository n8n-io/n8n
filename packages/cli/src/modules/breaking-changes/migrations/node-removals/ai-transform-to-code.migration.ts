import type { NodeMigration } from '../node-migration';

/**
 * AI Transform to Code.
 *
 * Does:
 * - Target: `code`, version 2, `mode` = `runOnceForAllItems`, `language` = `javaScript`.
 *   Both nodes run the code in the same `JsTaskRunnerSandbox` and store it in `jsCode`.
 * - Keeps: `jsCode`.
 * - Drops: `instructions` and `codeGeneratedForPrompt`. They only help to write the
 *   code and have no effect at run time.
 *
 * Refuses when:
 * - `jsCode` is empty: the node has no generated code to carry over.
 *
 * Accepted changes:
 * - The prompt text is lost. It has no effect at run time.
 */
export const aiTransformToCode: NodeMigration = {
	ruleId: 'ai-transform-deprecated',
	migrate: (node) => {
		const jsCode = node.parameters.jsCode;
		if (!jsCode) {
			throw new Error(
				'This AI Transform node never generated any code, so there is nothing to carry over. Replace it with a Code node and write the code for its instructions by hand.',
			);
		}

		return {
			node: {
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				parameters: {
					mode: 'runOnceForAllItems',
					language: 'javaScript',
					jsCode,
				},
			},
		};
	},
};
