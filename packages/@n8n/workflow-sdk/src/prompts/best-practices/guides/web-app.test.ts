import { WebAppBestPractices } from './web-app';

describe('WebAppBestPractices', () => {
	it('decodes the injected base64 data as UTF-8 on the client', () => {
		const documentation = new WebAppBestPractices().getDocumentation();

		expect(documentation).not.toContain('JSON.parse(atob(');
		expect(documentation.match(/JSON\.parse\(new TextDecoder\(\)\.decode\(/g)).toHaveLength(2);
	});
});
