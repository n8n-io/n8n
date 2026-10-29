import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

const generate = vi.fn();

vi.mock('@n8n/instance-ai', async () => {
	const evalAgents = await vi.importActual<typeof import('@n8n/instance-ai')>('@n8n/instance-ai');
	return {
		createEvalAgent: () => ({ generate }),
		extractText: evalAgents.extractText,
		isRetryableEvalError: evalAgents.isRetryableEvalError,
	};
});

import { generateJson } from '../mock-utils';

const validate = (parsed: unknown) => (parsed && typeof parsed === 'object' ? parsed : undefined);

describe('generateJson', () => {
	beforeEach(() => generate.mockReset());

	it('does not retry a model error the provider will not recover from', async () => {
		generate.mockResolvedValue({
			messages: [],
			finishReason: 'error',
			error: Object.assign(new Error('invalid x-api-key'), { statusCode: 401, isRetryable: false }),
		});
		const logger = mock<Logger>();

		expect(await generateJson('mock', 'instructions', 'prompt', validate, logger)).toBeUndefined();
		expect(generate).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Eval model provider call failed (HTTP 401): invalid x-api-key'),
		);
	});

	it('retries a model error the provider can recover from, then gives up', async () => {
		generate.mockResolvedValue({
			messages: [],
			finishReason: 'error',
			error: Object.assign(new Error('Overloaded'), { statusCode: 529, isRetryable: true }),
		});

		expect(await generateJson('mock', 'i', 'p', validate, mock<Logger>())).toBeUndefined();
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it('retries an unusable shape', async () => {
		generate
			.mockResolvedValueOnce({
				messages: [{ role: 'assistant', content: [{ type: 'text', text: 'not json' }] }],
			})
			.mockResolvedValueOnce({
				messages: [{ role: 'assistant', content: [{ type: 'text', text: '{"ok":true}' }] }],
			});

		expect(await generateJson('mock', 'i', 'p', validate, mock<Logger>())).toEqual({ ok: true });
		expect(generate).toHaveBeenCalledTimes(2);
	});
});
