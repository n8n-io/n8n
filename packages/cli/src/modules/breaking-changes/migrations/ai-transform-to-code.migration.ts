import type { NodeMigration } from './node-migration';

/**
 * AI Transform → Code. Lossless when the node has generated code: both nodes run
 * the same JsTaskRunnerSandbox and store it under `jsCode`, and AI Transform always
 * runs once for all items. The AI-authoring-only params (`instructions`,
 * `codeGeneratedForPrompt`) are dropped because they have no runtime effect on the
 * Code node.
 *
 * A node whose prompt was never turned into code (`jsCode` empty) has nothing to
 * carry over, so we refuse rather than silently produce an empty Code node and
 * lose the prompt.
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
