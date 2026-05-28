import type { INodeTypes } from 'n8n-workflow';

import { resolveMainInputCount } from './input-resolver';

describe('resolveMainInputCount', () => {
	const createMockProvider = (inputs: unknown): INodeTypes =>
		({
			getByNameAndVersion: () => ({ description: { inputs } }),
			getByName: () => ({ description: { inputs } }),
			getKnownTypes: () => ({}),
		}) as unknown as INodeTypes;

	it('returns 1 for single main input node', () => {
		const provider = createMockProvider(['main']);
		const result = resolveMainInputCount(provider, 'n8n-nodes-base.aggregate', 1);
		expect(result).toBe(1);
	});

	it('returns 2 for dual main input node', () => {
		const provider = createMockProvider(['main', 'main']);
		const result = resolveMainInputCount(provider, 'n8n-nodes-base.merge', 3);
		expect(result).toBe(2);
	});

	it('returns undefined for expression-based inputs', () => {
		const provider = createMockProvider('={{configuredInputs($parameter)}}');
		const result = resolveMainInputCount(provider, 'n8n-nodes-base.merge', 3);
		expect(result).toBeUndefined();
	});

	it('counts only main inputs, ignores AI inputs', () => {
		const provider = createMockProvider([
			'main',
			{ type: 'ai_languageModel', displayName: 'Model' },
		]);
		const result = resolveMainInputCount(provider, '@n8n/n8n-nodes-langchain.agent', 1);
		expect(result).toBe(1);
	});

	it('returns undefined when provider throws', () => {
		const provider = {
			getByNameAndVersion: () => {
				throw new Error('Unknown node');
			},
			getByName: () => {
				throw new Error('Unknown node');
			},
			getKnownTypes: () => ({}),
		} as INodeTypes;
		const result = resolveMainInputCount(provider, 'unknown.node', 1);
		expect(result).toBeUndefined();
	});

	it('returns undefined when provider returns null', () => {
		const provider = {
			getByNameAndVersion: () => null,
			getByName: () => null,
			getKnownTypes: () => ({}),
		} as unknown as INodeTypes;
		const result = resolveMainInputCount(provider, 'unknown.node', 1);
		expect(result).toBeUndefined();
	});

	it('returns undefined when inputs property is missing', () => {
		const provider = {
			getByNameAndVersion: () => ({ description: {} }),
			getByName: () => ({ description: {} }),
			getKnownTypes: () => ({}),
		} as unknown as INodeTypes;
		const result = resolveMainInputCount(provider, 'n8n-nodes-base.set', 1);
		expect(result).toBeUndefined();
	});

	it('handles INodeInputConfiguration objects with type: main', () => {
		const provider = createMockProvider([
			{ type: 'main', displayName: 'Input 1' },
			{ type: 'main', displayName: 'Input 2' },
		]);
		const result = resolveMainInputCount(provider, 'n8n-nodes-base.merge', 3);
		expect(result).toBe(2);
	});
});
