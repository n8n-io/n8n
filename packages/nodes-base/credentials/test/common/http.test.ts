import { getUrl } from '@credentials/common/http';

describe('getUrl', () => {
	it('should throw an error if no url is provided', () => {
		expect(() => getUrl({})).toThrow('No URL found in request options');
	});
	it('should return the url', () => {
		const url = getUrl({ url: 'https://example.com' });
		expect(url).toBe('https://example.com/');
	});
	it('should return the url with baseURL', () => {
		const url = getUrl({ baseURL: 'https://example.com', url: '/test' });
		expect(url).toBe('https://example.com/test');
	});
	it('should return the url with uri', () => {
		const url = getUrl({ uri: 'https://example.com/test' });
		expect(url).toBe('https://example.com/test');
	});
});
