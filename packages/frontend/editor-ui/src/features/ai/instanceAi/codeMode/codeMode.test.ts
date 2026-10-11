import { isWebsiteBuildRequest } from './codeMode';

describe('isWebsiteBuildRequest', () => {
	it('matches a request to make a website', () => {
		expect(isWebsiteBuildRequest('Make me a website')).toBe(true);
		expect(isWebsiteBuildRequest('Build a landing page for the launch')).toBe(true);
		expect(isWebsiteBuildRequest('Can you design a site for Acme?')).toBe(true);
		expect(isWebsiteBuildRequest('Show code mode')).toBe(true);
	});

	it('leaves ordinary chat alone', () => {
		expect(isWebsiteBuildRequest('Say hello back to me')).toBe(false);
		expect(isWebsiteBuildRequest('Build a workflow that posts to Slack')).toBe(false);
	});
});
