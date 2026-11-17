import { fetchLocaleCatalog } from './settings';

const remoteUrl = 'https://translations.example.com/n8n/de/de_2.4.json';
const localUrl = 'locales/de.0a74b604c023226e.json';

const mockFetch = (body: unknown, init: ResponseInit = { status: 200 }) => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), init));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

describe('fetchLocaleCatalog', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fetch an absolute URL as it is, without credentials', async () => {
		const fetchMock = mockFetch({ 'generic.save': 'Speichern' });

		expect(await fetchLocaleCatalog(remoteUrl, '/')).toEqual({ 'generic.save': 'Speichern' });
		expect(fetchMock).toHaveBeenCalledWith(remoteUrl, { credentials: 'omit' });
	});

	it.each([
		['the root base path', '/', `${window.location.origin}/${localUrl}`],
		['a base path', '/n8n/', `${window.location.origin}/n8n/${localUrl}`],
		['an absolute base URL', 'http://localhost:5678/', `http://localhost:5678/${localUrl}`],
	])('should resolve a relative URL against %s', async (_, baseUrl, expected) => {
		const fetchMock = mockFetch({});

		await fetchLocaleCatalog(localUrl, baseUrl);

		expect(fetchMock).toHaveBeenCalledWith(expected, expect.anything());
	});

	it('should remove backend keys', async () => {
		mockFetch({ 'generic.save': 'Speichern', 'backend.error.notFound': 'Nicht gefunden' });

		expect(await fetchLocaleCatalog(remoteUrl, '/')).toEqual({ 'generic.save': 'Speichern' });
	});

	it('should name the URL when the request fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

		await expect(fetchLocaleCatalog(remoteUrl, '/')).rejects.toThrow(remoteUrl);
	});

	it('should throw on a non-2xx status', async () => {
		mockFetch('Not found', { status: 404 });

		await expect(fetchLocaleCatalog(remoteUrl, '/')).rejects.toThrow('HTTP 404');
	});

	it('should throw on invalid JSON', async () => {
		mockFetch('{not json');

		await expect(fetchLocaleCatalog(remoteUrl, '/')).rejects.toThrow();
	});

	it('should throw when the JSON is not an object', async () => {
		mockFetch(['Speichern']);

		await expect(fetchLocaleCatalog(remoteUrl, '/')).rejects.toThrow('not a JSON object');
	});
});
