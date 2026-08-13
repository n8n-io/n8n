import { GenerateSpecError, generateSpec } from './generate';
import type { WorkflowUiPayload } from './workflowPayload';

const payload: WorkflowUiPayload = {
	name: 'Lead flow',
	nodes: [],
	connections: {},
};

describe('generateSpec', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('parses the generated spec and sends the API key', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				content: [
					{
						type: 'text',
						text: '{"root":"s","elements":{"s":{"type":"Screen","props":{}}}}',
					},
				],
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		expect(result).toEqual({
			root: 's',
			elements: {
				s: {
					type: 'Screen',
					props: {},
				},
			},
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'/dev/anthropic',
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-api-key': 'test-api-key' }),
			}),
		);
	});

	it('parses a fenced JSON response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					content: [
						{
							type: 'text',
							text: '```json\n{"root":"screen","elements":{}}\n```',
						},
					],
				}),
			}),
		);

		await expect(
			generateSpec({
				apiKey: 'test-api-key',
				view: 'play',
				payload,
			}),
		).resolves.toEqual({ root: 'screen', elements: {} });
	});

	it('throws a typed unauthorized error for an HTTP 401 response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
			}),
		);

		const request = generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		await expect(request).rejects.toBeInstanceOf(GenerateSpecError);
		await expect(request).rejects.toMatchObject({ code: 'unauthorized' });
	});

	it('throws a typed invalid response error for malformed JSON', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					content: [{ type: 'text', text: '{not-json}' }],
				}),
			}),
		);

		const request = generateSpec({
			apiKey: 'test-api-key',
			view: 'story',
			payload,
		});

		await expect(request).rejects.toBeInstanceOf(GenerateSpecError);
		await expect(request).rejects.toMatchObject({ code: 'invalid-response' });
	});
});
