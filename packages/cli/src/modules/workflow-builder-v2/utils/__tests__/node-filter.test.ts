import type { INodeTypeDescription } from 'n8n-workflow';

import { checkStandalone, type LookupNodeDescription } from '../node-filter';

function descriptionWithOutputs(outputs: INodeTypeDescription['outputs']): INodeTypeDescription {
	return { outputs } as unknown as INodeTypeDescription;
}

describe('checkStandalone', () => {
	it('allows a trigger with a `main` output', () => {
		const lookup: LookupNodeDescription = () => descriptionWithOutputs(['main']);

		const result = checkStandalone('n8n-nodes-base.scheduleTrigger', 1, lookup);

		expect(result).toEqual({ allowed: true });
	});

	it('allows a standard node with a `main` output (object form)', () => {
		const lookup: LookupNodeDescription = () =>
			descriptionWithOutputs([{ type: 'main', displayName: 'Output' }]);

		const result = checkStandalone('n8n-nodes-base.httpRequest', 4, lookup);

		expect(result).toEqual({ allowed: true });
	});

	it('rejects a language-model sub-node', () => {
		const lookup: LookupNodeDescription = () => descriptionWithOutputs(['ai_languageModel']);

		const result = checkStandalone('@n8n/n8n-nodes-langchain.lmChatOpenAi', 1, lookup);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toContain('sub-node');
			expect(result.reason).toContain('@n8n/n8n-nodes-langchain.lmChatOpenAi');
		}
	});

	it('rejects a memory sub-node', () => {
		const lookup: LookupNodeDescription = () => descriptionWithOutputs(['ai_memory']);

		const result = checkStandalone('@n8n/n8n-nodes-langchain.memoryBufferWindow', 1, lookup);

		expect(result.allowed).toBe(false);
	});

	it('rejects an AI tool sub-node', () => {
		const lookup: LookupNodeDescription = () =>
			descriptionWithOutputs([{ type: 'ai_tool', displayName: 'Tool' }]);

		const result = checkStandalone('n8n-nodes-base.gmailTool', 1, lookup);

		expect(result.allowed).toBe(false);
	});

	it('allows AI Agent (parent node with main output)', () => {
		// The AI Agent node has `main` output even though it also accepts
		// ai_languageModel/ai_tool inputs — it's a top-level node.
		const lookup: LookupNodeDescription = () => descriptionWithOutputs(['main']);

		const result = checkStandalone('@n8n/n8n-nodes-langchain.agent', 1, lookup);

		expect(result).toEqual({ allowed: true });
	});

	it('allows unknown node types (lookup returns null)', () => {
		const lookup: LookupNodeDescription = () => null;

		const result = checkStandalone('community.someUnknownNode', 1, lookup);

		// Documented behavior: we can't inspect what we can't load, so we
		// trust the LLM on canonical names. The commit/runtime layer will
		// surface a clearer error if the node genuinely doesn't exist.
		expect(result).toEqual({ allowed: true });
	});
});
