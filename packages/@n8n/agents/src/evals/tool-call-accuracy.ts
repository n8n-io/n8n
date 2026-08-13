import { Eval } from '../sdk/eval';

/**
 * Deterministic tool call accuracy eval.
 * Expects `expected` to be a comma-separated list of tool names that should have been called.
 * Passes only if ALL expected tools were called.
 */
export function toolCallAccuracy(): Eval {
	return new Eval('tool-call-accuracy')
		.description('Checks if the agent called all expected tools')
		.check(({ expected, toolCalls }) => {
			if (!expected) {
				return { pass: false, reasoning: 'No expected tool names provided' };
			}

			const expectedTools = expected
				.split(',')
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			if (expectedTools.length === 0) {
				return { pass: false, reasoning: 'No expected tools to check' };
			}

			const calledTools = new Set((toolCalls ?? []).map((tc) => tc.tool.toLowerCase()));
			const missing = expectedTools.filter((t) => !calledTools.has(t));

			return {
				pass: missing.length === 0,
				reasoning:
					missing.length === 0
						? `All ${expectedTools.length} expected tools were called`
						: `Missing tools: ${missing.join(', ')}. Called: [${[...calledTools].join(', ') || 'none'}]`,
			};
		});
}
