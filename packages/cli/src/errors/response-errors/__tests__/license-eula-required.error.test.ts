import { LicenseEulaRequiredError } from '../license-eula-required.error';

describe('LicenseEulaRequiredError', () => {
	it('should create error with correct message and meta', () => {
		const eulaUrl = 'https://n8n.io/legal/eula/';
		const error = new LicenseEulaRequiredError('License activation requires EULA acceptance', {
			eulaUrl,
		});

		expect(error.message).toBe('License activation requires EULA acceptance');
		expect(error.meta.eulaUrl).toBe(eulaUrl);
		expect(error.httpStatusCode).toBe(400);
		expect(error.name).toBe('LicenseEulaRequiredError');
	});

	it('should be instance of Error', () => {
		const error = new LicenseEulaRequiredError('Test message', {
			eulaUrl: 'https://example.com',
		});

		expect(error).toBeInstanceOf(Error);
	});
});
