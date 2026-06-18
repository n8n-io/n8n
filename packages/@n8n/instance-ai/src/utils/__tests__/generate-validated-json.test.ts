import type { MockedFunction } from 'vitest';
import { z } from 'zod';

vi.mock('../eval-agents', async () => {
	const actual: object = await vi.importActual('../eval-agents');
	return { ...actual, createEvalAgent: vi.fn(), extractText: vi.fn() };
});

import { createEvalAgent, extractText } from '../eval-agents';
import { generateValidatedJson } from '../generate-validated-json';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as MockedFunction<typeof extractText>;

const schema = z.object({ ok: z.boolean() });

function setupAgentMock(responseText: string) {
	const generate = vi.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
	return generate;
}

async function generate(userText = 'do it') {
	return await generateValidatedJson('test-agent', {
		instructions: 'instructions',
		userText,
		schema,
	});
}

describe('generateValidatedJson', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns validated data for a plain JSON response', async () => {
		setupAgentMock('{"ok": true}');
		expect(await generate()).toEqual({ ok: true, data: { ok: true } });
	});

	it('strips markdown fences around the JSON', async () => {
		setupAgentMock('```json\n{"ok": false}\n```');
		expect(await generate()).toEqual({ ok: true, data: { ok: false } });
	});

	it('sends the user text as a single user message', async () => {
		const generateMock = setupAgentMock('{"ok": true}');
		await generate('classify this');
		expect(generateMock).toHaveBeenCalledWith([
			{ role: 'user', content: [{ type: 'text', text: 'classify this' }] },
		]);
	});

	it('reports invalid_json on unparseable output', async () => {
		setupAgentMock('not json');
		expect(await generate()).toEqual({ ok: false, reason: 'invalid_json' });
	});

	it('reports schema_mismatch with issues on shape errors', async () => {
		setupAgentMock('{"ok": "yes"}');
		const result = await generate();
		expect(result).toMatchObject({ ok: false, reason: 'schema_mismatch' });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.issues?.length).toBeGreaterThan(0);
	});

	it('reports generation_failed when the LLM call throws', async () => {
		const generateMock = vi.fn().mockRejectedValue(new Error('boom'));
		mockCreateEvalAgent.mockReturnValue({ generate: generateMock } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		expect(await generate()).toEqual({ ok: false, reason: 'generation_failed' });
	});

	it('reports generation_failed when agent creation throws', async () => {
		mockCreateEvalAgent.mockImplementation(() => {
			throw new Error('no api key');
		});
		expect(await generate()).toEqual({ ok: false, reason: 'generation_failed' });
	});
});
