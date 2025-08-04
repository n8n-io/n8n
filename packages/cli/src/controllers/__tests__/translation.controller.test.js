'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const translation_controller_1 = require('@/controllers/translation.controller');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
describe('TranslationController', () => {
	const credentialTypes = (0, jest_mock_extended_1.mock)();
	const controller = new translation_controller_1.TranslationController(
		credentialTypes,
		(0, jest_mock_extended_1.mock)({ defaultLocale: 'de' }),
	);
	describe('getCredentialTranslation', () => {
		it('should throw 400 on invalid credential types', async () => {
			const credentialType = 'not-a-valid-credential-type';
			const req = (0, jest_mock_extended_1.mock)({ query: { credentialType } });
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(false);
			await expect(controller.getCredentialTranslation(req)).rejects.toThrowError(
				new bad_request_error_1.BadRequestError(`Invalid Credential type: "${credentialType}"`),
			);
		});
		it('should return translation json on valid credential types', async () => {
			const credentialType = 'credential-type';
			const req = (0, jest_mock_extended_1.mock)({ query: { credentialType } });
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(true);
			const response = { translation: 'string' };
			jest.mock(
				`${translation_controller_1.CREDENTIAL_TRANSLATIONS_DIR}/de/credential-type.json`,
				() => response,
				{
					virtual: true,
				},
			);
			expect(await controller.getCredentialTranslation(req)).toEqual(response);
		});
	});
});
//# sourceMappingURL=translation.controller.test.js.map
