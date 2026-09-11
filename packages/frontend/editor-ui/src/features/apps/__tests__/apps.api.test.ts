import { makeRestApiRequest, rawRequest } from '@n8n/rest-api-client';

import { createPageApi, fetchPreviewApi, fetchServedCssApi } from '@/features/apps/apps.api';

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

	it('fetchPreviewApi() returns the html body, the render errors and the code from the headers', async () => {
		vi.mocked(rawRequest).mockResolvedValue(
			response('<html></html>', {
				'x-n8n-app-render-errors': '{"b1":"boom"}',
				'x-n8n-app-code': 'abc123',
			}),
		);

		const result = await fetchPreviewApi(context, 'p1', 'app1', 'page1', { path: '' });

		expect(rawRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				endpoint: '/projects/p1/apps/app1/pages/page1/preview?path=',
			}),
		);
		expect(result).toEqual({ html: '<html></html>', errors: { b1: 'boom' }, code: 'abc123' });
	});

	it('createPageApi() sends the title and the parent only when given', async () => {
		await createPageApi(context, 'p1', 'app1', 'about', undefined, 'About us');
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(
			context,
			'POST',
			'/projects/p1/apps/app1/pages',
			{ route: 'about', title: 'About us' },
		);

		await createPageApi(context, 'p1', 'app1', 'leads', 'reports');
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(
			context,
			'POST',
			'/projects/p1/apps/app1/pages',
			{ route: 'leads', parentPageId: 'reports' },
		);
	});

	it('fetchServedCssApi() reads the public stylesheet from the instance root', async () => {
		vi.mocked(rawRequest).mockResolvedValue(response('.app-canvas{}', {}));

		const css = await fetchServedCssApi('http://localhost:5678/');

		expect(rawRequest).toHaveBeenCalledWith({
			method: 'GET',
			baseURL: 'http://localhost:5678/',
			endpoint: '/apps/_static/app.css',
		});
		expect(css).toBe('.app-canvas{}');
	});

	it('fetchPreviewApi() returns no errors and no code when the headers are absent', async () => {
		vi.mocked(rawRequest).mockResolvedValue(response('<html></html>', {}));

		const result = await fetchPreviewApi(context, 'p1', 'app1', 'page1', { path: '' });

		expect(result).toEqual({ html: '<html></html>', errors: {}, code: null });
	});
});
