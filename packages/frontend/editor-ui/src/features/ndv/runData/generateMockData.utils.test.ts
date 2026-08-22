import { describe, expect, it } from 'vitest';
import {
	buildGenerateMockDataPrompt,
	isExternalIntegrationNode,
	MAX_QUESTION_LENGTH,
	parseGenerateMockDataResponse,
	resolveGenerateMockDataMode,
} from './generateMockData.utils';

describe('isExternalIntegrationNode', () => {
	it('is true when the node type declares credentials', () => {
		expect(isExternalIntegrationNode({ credentials: [{ name: 'slackApi', required: true }] })).toBe(
			true,
		);
	});

	it('is false for core utilities without credentials', () => {
		expect(isExternalIntegrationNode({ credentials: [] })).toBe(false);
		expect(isExternalIntegrationNode({})).toBe(false);
		expect(isExternalIntegrationNode(null)).toBe(false);
	});
});

describe('resolveGenerateMockDataMode', () => {
	it('keeps success and failure as-is', () => {
		expect(resolveGenerateMockDataMode('success', '')).toBe('success');
		expect(resolveGenerateMockDataMode('failure', 'anything')).toBe('failure');
	});

	it('resolves describe with empty hint to success', () => {
		expect(resolveGenerateMockDataMode('describe', '')).toBe('success');
		expect(resolveGenerateMockDataMode('describe', '   ')).toBe('success');
	});

	it('keeps describe when scenario text is present', () => {
		expect(resolveGenerateMockDataMode('describe', 'failed payment')).toBe('describe');
	});
});

describe('buildGenerateMockDataPrompt', () => {
	const base = {
		nodeType: 'n8n-nodes-base.webhook',
		nodeName: 'Webhook',
		parameters: { path: 'hook' },
		scenarioText: '',
	};

	it('asks for success payloads', () => {
		const prompt = buildGenerateMockDataPrompt({ ...base, mode: 'success' });
		expect(prompt).toContain('SUCCESS');
		expect(prompt).toContain('n8n-nodes-base.webhook');
		expect(prompt).toContain('ONLY a JSON array');
	});

	it('asks for failure payloads', () => {
		const prompt = buildGenerateMockDataPrompt({ ...base, mode: 'failure' });
		expect(prompt).toContain('FAILURE');
		expect(prompt).toContain('error');
	});

	it('includes the user scenario for describe mode', () => {
		const prompt = buildGenerateMockDataPrompt({
			...base,
			mode: 'describe',
			scenarioText: 'include an attachment',
		});
		expect(prompt).toContain('include an attachment');
	});

	it('stays within the length the AI service accepts', () => {
		const parameters = { query: 'x'.repeat(5000), nested: { values: Array(200).fill('value') } };

		for (const mode of ['success', 'failure', 'describe'] as const) {
			const prompt = buildGenerateMockDataPrompt({
				...base,
				mode,
				scenarioText: 'y'.repeat(1000),
				parameters,
			});

			expect(prompt.length).toBeLessThanOrEqual(MAX_QUESTION_LENGTH);
		}
	});

	it('keeps the instructions when parameters leave no budget', () => {
		const prompt = buildGenerateMockDataPrompt({
			...base,
			mode: 'success',
			nodeName: 'N'.repeat(600),
			parameters: { query: 'x'.repeat(500) },
		});

		expect(prompt.length).toBeLessThanOrEqual(MAX_QUESTION_LENGTH);
		expect(prompt).toContain('ONLY a JSON array');
		expect(prompt).not.toContain('Params:');
	});
});

describe('parseGenerateMockDataResponse', () => {
	it('parses a plain JSON array', () => {
		expect(parseGenerateMockDataResponse('[{"a":1},{"b":2}]')).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it('strips markdown fences', () => {
		const raw = '```json\n[{"ok":true}]\n```';
		expect(parseGenerateMockDataResponse(raw)).toEqual([{ ok: true }]);
	});

	it('strips a return statement from a code-shaped answer', () => {
		const raw = '```javascript\nreturn [{"ok":true}];\n```';
		expect(parseGenerateMockDataResponse(raw)).toEqual([{ ok: true }]);
	});

	it('extracts the array when the answer is surrounded by prose or code', () => {
		const raw =
			'Here is the data:\n\nconst items = [{"id":"a]b"},{"id":2}];\n\nUse it as pin data.';
		expect(parseGenerateMockDataResponse(raw)).toEqual([{ id: 'a]b' }, { id: 2 }]);
	});

	it('unwraps items returned in n8n json shape', () => {
		const raw = '[{"json":{"id":1}},{"json":{"id":2}}]';
		expect(parseGenerateMockDataResponse(raw)).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it('keeps items that only happen to have a json field alongside others', () => {
		const raw = '[{"json":{"id":1},"source":"api"}]';
		expect(parseGenerateMockDataResponse(raw)).toEqual([{ json: { id: 1 }, source: 'api' }]);
	});

	it('rejects non-arrays', () => {
		expect(() => parseGenerateMockDataResponse('{"a":1}')).toThrow('Expected a JSON array');
	});

	it('rejects empty arrays', () => {
		expect(() => parseGenerateMockDataResponse('[]')).toThrow('Expected a non-empty JSON array');
	});

	it('rejects arrays of non-objects', () => {
		expect(() => parseGenerateMockDataResponse('[1,2]')).toThrow('Expected an array of objects');
	});
});
