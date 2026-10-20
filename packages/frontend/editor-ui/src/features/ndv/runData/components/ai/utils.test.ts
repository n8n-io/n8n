import type { INodeExecutionData } from 'n8n-workflow';
import { getRespondingModelName } from './utils';

function createLlmOutput(generations: unknown): INodeExecutionData {
	return { json: { response: { generations } } };
}

describe('getRespondingModelName', () => {
	it('returns the model name from a generation', () => {
		const output = createLlmOutput([
			[{ text: 'Hello', generationInfo: { model_name: 'gpt-4.1-mini-2025-04-14' } }],
		]);

		expect(getRespondingModelName([output])).toBe('gpt-4.1-mini-2025-04-14');
	});

	it('returns the first model name when several generations have one', () => {
		const output = createLlmOutput([
			[{ text: 'a' }, { text: 'b', generationInfo: { model_name: 'first' } }],
			[{ text: 'c', generationInfo: { model_name: 'second' } }],
		]);

		expect(getRespondingModelName([output])).toBe('first');
	});

	it('finds the model name in a later output item', () => {
		const withoutName = createLlmOutput([[{ text: 'a' }]]);
		const withName = createLlmOutput([[{ text: 'b', generationInfo: { model_name: 'gpt-5' } }]]);

		expect(getRespondingModelName([null, withoutName, withName])).toBe('gpt-5');
	});

	it('returns undefined when no generation has a model name', () => {
		expect(getRespondingModelName([createLlmOutput([[{ text: 'Hello' }]])])).toBeUndefined();
		expect(
			getRespondingModelName([createLlmOutput([[{ text: 'Hello', generationInfo: {} }]])]),
		).toBeUndefined();
	});

	it('returns undefined when the output has no LLM response', () => {
		expect(getRespondingModelName([])).toBeUndefined();
		expect(getRespondingModelName([null])).toBeUndefined();
		expect(getRespondingModelName([{ json: {} }])).toBeUndefined();
		expect(getRespondingModelName([{ json: { response: 'text' } }])).toBeUndefined();
		expect(
			getRespondingModelName([{ json: { response: { generations: 'text' } } }]),
		).toBeUndefined();
	});

	it('returns undefined when the model name is empty or not a string', () => {
		const output = createLlmOutput([
			[
				{ text: 'a', generationInfo: { model_name: '' } },
				{ text: 'b', generationInfo: { model_name: '   ' } },
				{ text: 'c', generationInfo: { model_name: 42 } },
			],
		]);

		expect(getRespondingModelName([output])).toBeUndefined();
	});

	it('ignores the raw model key, which can hold a doubled value', () => {
		const onlyModel = createLlmOutput([
			[{ text: 'a', generationInfo: { model: 'gpt-4.1-minigpt-4.1-mini' } }],
		]);
		const both = createLlmOutput([
			[
				{
					text: 'a',
					generationInfo: { model: 'gpt-4.1-minigpt-4.1-mini', model_name: 'gpt-4.1-mini' },
				},
			],
		]);

		expect(getRespondingModelName([onlyModel])).toBeUndefined();
		expect(getRespondingModelName([both])).toBe('gpt-4.1-mini');
	});
});
