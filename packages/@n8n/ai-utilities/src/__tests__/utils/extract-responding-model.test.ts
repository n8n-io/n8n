import { AIMessage } from '@langchain/core/messages';
import type { ChatGeneration, Generation } from '@langchain/core/outputs';

import { extractRespondingModel, toRunDataGeneration } from 'src/utils/extract-responding-model';

function createChatGeneration(
	responseMetadata: Record<string, unknown>,
	generationInfo?: Record<string, unknown>,
): ChatGeneration {
	return {
		text: 'Hello',
		message: new AIMessage({ content: 'Hello', response_metadata: responseMetadata }),
		...(generationInfo && { generationInfo }),
	};
}

describe('extractRespondingModel', () => {
	it('returns the model name from generationInfo, where LangChain writes it when streaming', () => {
		const generation: Generation = {
			text: 'Hello',
			generationInfo: { finish_reason: 'stop', model_name: 'gpt-4.1-mini-2025-04-14' },
		};

		expect(extractRespondingModel(generation)).toBe('gpt-4.1-mini-2025-04-14');
	});

	it('returns the model name from the message when the generation has no generationInfo', () => {
		const generation = createChatGeneration({ model_name: 'gpt-4.1-mini-2025-04-14' });

		expect(extractRespondingModel(generation)).toBe('gpt-4.1-mini-2025-04-14');
	});

	it('returns the model name from the message when generationInfo has none', () => {
		const generation = createChatGeneration(
			{ model_name: 'gpt-4.1-mini-2025-04-14' },
			{ finish_reason: 'stop' },
		);

		expect(extractRespondingModel(generation)).toBe('gpt-4.1-mini-2025-04-14');
	});

	it('prefers generationInfo over the message', () => {
		const generation = createChatGeneration(
			{ model_name: 'from-message' },
			{ model_name: 'from-generation-info' },
		);

		expect(extractRespondingModel(generation)).toBe('from-generation-info');
	});

	it('falls back to the message when the generationInfo name is blank', () => {
		const generation = createChatGeneration({ model_name: 'from-message' }, { model_name: '   ' });

		expect(extractRespondingModel(generation)).toBe('from-message');
	});

	it('returns undefined when nothing reports a name', () => {
		expect(extractRespondingModel({ text: 'Hello' })).toBeUndefined();
		expect(extractRespondingModel({ text: 'Hello', generationInfo: {} })).toBeUndefined();
		expect(extractRespondingModel(createChatGeneration({}))).toBeUndefined();
		expect(
			extractRespondingModel(createChatGeneration({}, { finish_reason: 'stop' })),
		).toBeUndefined();
	});

	it('returns undefined when the name is blank or not a string', () => {
		const generation = createChatGeneration({ model_name: 42 }, { model_name: '' });

		expect(extractRespondingModel(generation)).toBeUndefined();
	});

	it('never reads the raw model key, which arrives doubled across stream chunks', () => {
		const generation = createChatGeneration(
			{ model: 'gpt-4.1-minigpt-4.1-mini' },
			{ model: 'gpt-4.1-minigpt-4.1-mini' },
		);

		expect(extractRespondingModel(generation)).toBeUndefined();
	});

	it('returns the clean name even when the raw model key is doubled next to it', () => {
		const generation = createChatGeneration(
			{ model: 'gpt-4.1-minigpt-4.1-mini', model_name: 'gpt-4.1-mini' },
			{ model: 'gpt-4.1-minigpt-4.1-mini' },
		);

		expect(extractRespondingModel(generation)).toBe('gpt-4.1-mini');
	});
});

describe('toRunDataGeneration', () => {
	it('keeps only text and generationInfo', () => {
		const generation = createChatGeneration({}, { finish_reason: 'stop' });

		expect(toRunDataGeneration(generation)).toEqual({
			text: 'Hello',
			generationInfo: { finish_reason: 'stop' },
		});
	});

	it('writes the resolved name to generationInfo, creating it when missing', () => {
		const generation = createChatGeneration({ model_name: 'gpt-4.1-mini' });

		expect(toRunDataGeneration(generation)).toEqual({
			text: 'Hello',
			generationInfo: { model_name: 'gpt-4.1-mini' },
		});
	});

	it('removes an unresolvable model_name and keeps the other generationInfo keys', () => {
		const result = toRunDataGeneration({
			text: 'Hello',
			generationInfo: { finish_reason: 'stop', model_name: '' },
		});

		expect(result.generationInfo).toEqual({ finish_reason: 'stop' });
		expect('model_name' in (result.generationInfo ?? {})).toBe(false);
	});

	it('leaves generationInfo absent when there is none and nothing resolves', () => {
		const result = toRunDataGeneration(createChatGeneration({}));

		expect('generationInfo' in result).toBe(false);
	});

	it('does not change the generation it receives', () => {
		const generationInfo = { finish_reason: 'stop', model_name: '' };
		const generation = createChatGeneration({ model_name: 'gpt-4.1-mini' }, generationInfo);

		toRunDataGeneration(generation);

		expect(generation.generationInfo).toEqual({ finish_reason: 'stop', model_name: '' });
		expect(generation.generationInfo).toBe(generationInfo);
	});
});
