import { NodeConnectionTypes } from 'n8n-workflow';
import type { NodeConnectionType, INodeInputConfiguration, ExpressionString } from 'n8n-workflow';

import { resolveConnections } from './connections';

const DEFAULT_VERSION = 1;

describe('resolveInputConnections', () => {
	it('should return empty array for empty inputs', () => {
		const inputs: NodeConnectionType[] = [];
		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual([]);
	});

	it('should return simple node connection types inputs as is', () => {
		const inputs = [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.AiDocument,
			NodeConnectionTypes.AiEmbedding,
		];

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual(inputs);
	});

	it('should return simple node input configurations as is', () => {
		const inputs = [
			{ type: NodeConnectionTypes.Main, displayName: 'Main', maxConnections: 1 },
			{ type: NodeConnectionTypes.AiDocument, displayName: 'Document', maxConnections: 1 },
		] satisfies INodeInputConfiguration[];

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual(inputs);
	});

	it('should evaluate simple expression', () => {
		const inputs =
			`={{ ["${NodeConnectionTypes.Main}", "${NodeConnectionTypes.AiDocument}"] }}` as const;

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual([NodeConnectionTypes.Main, NodeConnectionTypes.AiDocument]);
	});

	it('should evaluate expression with parameters', () => {
		const inputs = `={{ ["${NodeConnectionTypes.Main}", $parameter["extraInput"]] }}` as const;
		const parameters = { extraInput: NodeConnectionTypes.AiDocument };

		const result = resolveConnections(inputs, parameters, DEFAULT_VERSION);
		expect(result).toEqual([NodeConnectionTypes.Main, NodeConnectionTypes.AiDocument]);
	});

	it('should evaluate complex expression with parameters', () => {
		const inputs = `={{
			((parameters) => {
				const mode = parameters?.mode;
				const useReranker = parameters?.useReranker;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1}]

				if (['load', 'retrieve', 'retrieve-as-tool'].includes(mode) && useReranker) {
					inputs.push({ displayName: "Reranker", type: "${NodeConnectionTypes.AiReranker}", required: true, maxConnections: 1})
				}

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "Document", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}` satisfies ExpressionString;

		const parameters = { mode: 'load', useReranker: true };
		const result = resolveConnections(inputs, parameters, DEFAULT_VERSION);
		expect(result).toEqual([
			{
				displayName: 'Embedding',
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
				maxConnections: 1,
			},
			{
				displayName: 'Reranker',
				type: NodeConnectionTypes.AiReranker,
				required: true,
				maxConnections: 1,
			},
			{ displayName: '', type: NodeConnectionTypes.Main },
		]);

		const parameters2 = { mode: 'retrieve-as-tool', useReranker: false };
		const result2 = resolveConnections(inputs, parameters2, DEFAULT_VERSION);
		expect(result2).toEqual([
			{
				displayName: 'Embedding',
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
				maxConnections: 1,
			},
		]);
	});
});
