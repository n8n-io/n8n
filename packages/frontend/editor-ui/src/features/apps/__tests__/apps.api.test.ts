import { rawRequest } from '@n8n/rest-api-client';

import { fetchPreviewApi } from '@/features/apps/apps.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
	rawRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'ref' };

const response = (data: string, headers: Record<string, string>) =>
	({ data, headers }) as unknown as Awaited<ReturnType<typeof rawRequest>>;

describe('apps.api', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('fetchPreviewApi() returns the html body and the render errors from the header', async () => {
		vi.mocked(rawRequest).mockResolvedValue(
			response('<html></html>', { 'x-n8n-app-render-errors': '{"b1":"boom"}' }),
		);

		const result = await fetchPreviewApi(context, 'p1', 'app1', 'page1', { path: '' });

		expect(rawRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				endpoint: '/projects/p1/apps/app1/pages/page1/preview?path=',
			}),
		);
		expect(result).toEqual({ html: '<html></html>', errors: { b1: 'boom' } });
	});

	it('fetchPreviewApi() returns no errors when the header is absent', async () => {
		vi.mocked(rawRequest).mockResolvedValue(response('<html></html>', {}));

		const result = await fetchPreviewApi(context, 'p1', 'app1', 'page1', { path: '' });

		expect(result).toEqual({ html: '<html></html>', errors: {} });
	});
});
