import type * as AiImport from 'ai';
import type { LanguageModel } from 'ai';

import { generateTitleFromMessage } from '../runtime/title-generation';

type GenerateTextCall = {
	messages: Array<{ role: string; content: string }>;
};

const mockGenerateText = jest.fn<Promise<{ text: string }>, [GenerateTextCall]>();

jest.mock('ai', () => {
	const actual = jest.requireActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: GenerateTextCall): Promise<{ text: string }> =>
			await mockGenerateText(call),
	};
});

const fakeModel = {} as LanguageModel;

describe('generateTitleFromMessage', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('returns null for empty input without calling the LLM', async () => {
		const result = await generateTitleFromMessage(fakeModel, '   ');
		expect(result).toBeNull();
		expect(mockGenerateText).not.toHaveBeenCalled();
	});

	it('returns null for trivial greetings without calling the LLM', async () => {
		const result = await generateTitleFromMessage(fakeModel, 'hey');
		expect(result).toBeNull();
		expect(mockGenerateText).not.toHaveBeenCalled();
	});

	it('returns null for short multi-word messages without calling the LLM', async () => {
		const result = await generateTitleFromMessage(fakeModel, 'hi there');
		expect(result).toBeNull();
		expect(mockGenerateText).not.toHaveBeenCalled();
	});

	it('strips markdown heading prefixes from the LLM response', async () => {
		mockGenerateText.mockResolvedValue({ text: '# Daily Berlin rain alert' });
		const result = await generateTitleFromMessage(
			fakeModel,
			'Build a daily Berlin rain alert workflow',
		);
		expect(result).toBe('Daily Berlin rain alert');
	});

	it('strips inline emphasis markers from the LLM response', async () => {
		mockGenerateText.mockResolvedValue({ text: 'Your **Berlin** rain alert' });
		const result = await generateTitleFromMessage(
			fakeModel,
			'Build a daily Berlin rain alert workflow',
		);
		expect(result).toBe('Your Berlin rain alert');
	});

	it('strips <think> reasoning blocks from the LLM response', async () => {
		mockGenerateText.mockResolvedValue({
			text: '<think>Let me think about this</think>Deploy release pipeline',
		});
		const result = await generateTitleFromMessage(
			fakeModel,
			'Help me set up an automated deploy pipeline',
		);
		expect(result).toBe('Deploy release pipeline');
	});

	it('strips surrounding quotes from the LLM response', async () => {
		mockGenerateText.mockResolvedValue({ text: '"Build Gmail to Slack workflow"' });
		const result = await generateTitleFromMessage(
			fakeModel,
			'Build a workflow that forwards Gmail to Slack',
		);
		expect(result).toBe('Build Gmail to Slack workflow');
	});

	it('truncates titles longer than 80 characters at a word boundary', async () => {
		mockGenerateText.mockResolvedValue({
			text: 'Create a data table for users, then build a workflow that syncs them to our CRM every hour',
		});
		const result = await generateTitleFromMessage(
			fakeModel,
			'Create a data table for users and sync them to our CRM every hour with error alerting',
		);
		expect(result).not.toBeNull();
		expect(result!.length).toBeLessThanOrEqual(81);
		expect(result!.endsWith('\u2026')).toBe(true);
	});

	it('returns null when the LLM returns empty text', async () => {
		mockGenerateText.mockResolvedValue({ text: '   ' });
		const result = await generateTitleFromMessage(
			fakeModel,
			'Build a daily Berlin rain alert workflow',
		);
		expect(result).toBeNull();
	});

	it('passes the default instructions to the LLM', async () => {
		mockGenerateText.mockResolvedValue({ text: 'Berlin rain alert' });
		await generateTitleFromMessage(fakeModel, 'Build a daily Berlin rain alert workflow');
		const call = mockGenerateText.mock.calls[0][0];
		expect(call.messages[0].role).toBe('system');
		expect(call.messages[0].content).toContain('markdown');
		expect(call.messages[0].content).toContain('sentence case');
	});

	it('accepts custom instructions', async () => {
		mockGenerateText.mockResolvedValue({ text: 'Custom title' });
		await generateTitleFromMessage(fakeModel, 'Build a daily Berlin rain alert workflow', {
			instructions: 'Custom system prompt',
		});
		const call = mockGenerateText.mock.calls[0][0];
		expect(call.messages[0].content).toBe('Custom system prompt');
	});

	it('wraps the user message in a title-generation instruction so the model does not answer it', async () => {
		mockGenerateText.mockResolvedValue({ text: 'Berlin rain alert' });
		await generateTitleFromMessage(fakeModel, 'Build a daily Berlin rain alert workflow');
		const call = mockGenerateText.mock.calls[0][0];
		expect(call.messages[1].role).toBe('user');
		expect(call.messages[1].content).toContain('Generate a title');
		expect(call.messages[1].content).toContain('<message>');
		expect(call.messages[1].content).toContain('Build a daily Berlin rain alert workflow');
		expect(call.messages[1].content).toContain('</message>');
	});

	it('drops a streamed code fence and everything after it', async () => {
		mockGenerateText.mockResolvedValue({
			text: 'Here\'s your chat workflow with the requested configuration:\n\n```json\n{\n  "nodes": []\n}\n```',
		});
		const result = await generateTitleFromMessage(
			fakeModel,
			'build me a chat workflow with openai',
		);
		expect(result).toBe("Here's your chat workflow with the requested configuration");
		expect(result).not.toContain('```');
		expect(result).not.toContain('\n');
	});

	it('collapses embedded newlines and stray backticks into a single-line title', async () => {
		mockGenerateText.mockResolvedValue({
			text: 'Scryfall\nrandom `card` workflow',
		});
		const result = await generateTitleFromMessage(
			fakeModel,
			'build a workflow that queries Scryfall for a random card',
		);
		expect(result).toBe('Scryfall random card workflow');
	});
});
