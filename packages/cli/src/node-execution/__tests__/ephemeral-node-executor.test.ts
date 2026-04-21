import { NodeConnectionTypes } from 'n8n-workflow';

import { isUsableAsAgentTool } from '../ephemeral-node-executor';

describe('isUsableAsAgentTool', () => {
	it('accepts a standard node with usableAsTool: true', () => {
		expect(isUsableAsAgentTool({ usableAsTool: true, outputs: ['main'] })).toBe(true);
	});

	it('accepts a native tool node that outputs AiTool (string form)', () => {
		// e.g. toolWikipedia — no `usableAsTool` flag but outputs are declared as [AiTool].
		expect(isUsableAsAgentTool({ outputs: [NodeConnectionTypes.AiTool] })).toBe(true);
	});

	it('accepts a native tool node that outputs AiTool (object form)', () => {
		// Some nodes use the richer `INodeOutputConfiguration` shape.
		expect(isUsableAsAgentTool({ outputs: [{ type: NodeConnectionTypes.AiTool }] })).toBe(true);
	});

	it('rejects a non-tool node with only main outputs and no flag', () => {
		expect(isUsableAsAgentTool({ outputs: ['main'] })).toBe(false);
	});

	it('rejects a description without outputs or flag', () => {
		expect(isUsableAsAgentTool({})).toBe(false);
	});

	it('ignores outputs that are not an array (e.g. expression form)', () => {
		// Defensive — expression-based outputs resolve at runtime and aren't a
		// stable marker of tool-hood at validation time.
		expect(isUsableAsAgentTool({ outputs: '={{$json.out}}' })).toBe(false);
	});
});
