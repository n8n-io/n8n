import { generateSpec } from './generate';
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
});
