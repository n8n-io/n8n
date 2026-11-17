import { getLocaleCatalog, getRemoteLocaleCatalog, loadLocaleCatalog } from './settings';
import type { IRestApiContext } from '../types';
import * as utils from '../utils';

vi.mock('../utils');

const context = {} as IRestApiContext;
const url = 'https://translations.example.com/n8n/de/de_2.4.json';

const mockFetch = (body: unknown, init: ResponseInit = { status: 200 }) => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), init));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

describe('locale catalogs', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	describe('getLocaleCatalog', () => {
		it('should send the hash as the "v" query parameter', async () => {
			await getLocaleCatalog(context, 'de', 'abc123');

			expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/locales/de', {
				v: 'abc123',
			});
		});

		it('should send no query parameter without a hash', async () => {
			await getLocaleCatalog(context, 'de');

			expect(utils.makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'GET',
				'/locales/de',
				undefined,
			);
		});
	});

	describe('getRemoteLocaleCatalog', () => {
		it('should fetch the URL without credentials', async () => {
			const fetchMock = mockFetch({ 'generic.save': 'Speichern' });

			expect(await getRemoteLocaleCatalog(url)).toEqual({ 'generic.save': 'Speichern' });
			expect(fetchMock).toHaveBeenCalledWith(url, { credentials: 'omit' });
		});

		it('should remove backend keys', async () => {
			mockFetch({ 'generic.save': 'Speichern', 'backend.error.notFound': 'Nicht gefunden' });

			expect(await getRemoteLocaleCatalog(url)).toEqual({ 'generic.save': 'Speichern' });
		});

		it('should name the URL when the request fails', async () => {
			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

			await expect(getRemoteLocaleCatalog(url)).rejects.toThrow(url);
		});

		it('should throw on a non-2xx status', async () => {
			mockFetch('Not found', { status: 404 });

			await expect(getRemoteLocaleCatalog(url)).rejects.toThrow('HTTP 404');
		});

		it('should throw on invalid JSON', async () => {
			mockFetch('{not json');

			await expect(getRemoteLocaleCatalog(url)).rejects.toThrow();
		});

		it('should throw when the JSON is not an object', async () => {
			mockFetch(['Speichern']);

			await expect(getRemoteLocaleCatalog(url)).rejects.toThrow('not a JSON object');
		});
	});

	describe('loadLocaleCatalog', () => {
		it('should load a remote catalog from its URL and not through n8n', async () => {
			const fetchMock = mockFetch({ 'generic.save': 'Speichern' });

			await loadLocaleCatalog(context, { code: 'de', name: 'Deutsch', url });

			expect(fetchMock).toHaveBeenCalledWith(url, expect.anything());
			expect(utils.makeRestApiRequest).not.toHaveBeenCalled();
		});

		it('should load a local catalog through n8n with its hash', async () => {
			const fetchMock = mockFetch({});

			await loadLocaleCatalog(context, { code: 'fr', name: 'Français', hash: 'abc123' });

			expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/locales/fr', {
				v: 'abc123',
			});
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});
