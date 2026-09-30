import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { classifyHttpError, HttpErrorKind } from '@n8n/backend-services';

describe('classifyHttpError', () => {
	it('includes meta for LicenseEulaRequiredError', () => {
		const eulaUrl = 'https://n8n.io/legal/eula/';
		const descriptor = classifyHttpError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl,
			}),
		);

		expect(descriptor.kind).toBe(HttpErrorKind.responseError);
		if (descriptor.kind === HttpErrorKind.responseError) {
			expect(descriptor.status).toBe(400);
			expect(descriptor.meta).toEqual({ eulaUrl });
		}
	});
});
