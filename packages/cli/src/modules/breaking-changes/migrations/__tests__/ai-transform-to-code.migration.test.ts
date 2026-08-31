import { createNode } from '../../__tests__/test-helpers';
import { AI_TRANSFORM_NODE_TYPE } from '../../rules/v3/ai-transform-deprecated.rule';
import { aiTransformToCode } from '../ai-transform-to-code.migration';

describe('aiTransformToCode migration', () => {
	it('is keyed by the AI Transform rule id', () => {
		expect(aiTransformToCode.ruleId).toBe('ai-transform-deprecated');
	});

	it('rewrites AI Transform to a Code node carrying jsCode verbatim', () => {
		const node = createNode('Transform', AI_TRANSFORM_NODE_TYPE, {
			jsCode: 'return [{ json: { ok: true } }];',
			instructions: 'do a thing',
			codeGeneratedForPrompt: 'do a thing',
		});

		const result = aiTransformToCode.migrate(node);

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			parameters: {
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode: 'return [{ json: { ok: true } }];',
			},
		});
		// Lossless: nothing dropped, nothing to warn about.
		expect(result.unmapped).toBeUndefined();
		expect(result.notes).toBeUndefined();
	});

	it('refuses to migrate a node whose prompt was never turned into code', () => {
		// Prompt entered but "Generate code" never clicked → jsCode is empty.
		const node = createNode('Transform', AI_TRANSFORM_NODE_TYPE, {
			instructions: 'Double the value',
			jsCode: '',
		});

		expect(() => aiTransformToCode.migrate(node)).toThrow('no generated code yet');
	});
});
