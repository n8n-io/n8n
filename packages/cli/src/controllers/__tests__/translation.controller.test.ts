import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { TranslationRequest } from '@/controllers/translation.controller';
import {
	TranslationController,
	CREDENTIAL_TRANSLATIONS_DIR,
} from '@/controllers/translation.controller';
import type { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

describe('TranslationController', () => {
	const credentialTypes = mock<CredentialTypes>();
	const controller = new TranslationController(
		credentialTypes,
		mock<GlobalConfig>({ defaultLocale: 'de' }),
	);

	describe('getCredentialTranslation', () => {
		it('should throw 400 on invalid credential types', async () => {
			const credentialType = 'not-a-valid-credential-type';
			const req = mock<TranslationRequest.Credential>({ query: { credentialType } });
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(false);

			await expect(controller.getCredentialTranslation(req)).rejects.toThrowError(
				new BadRequestError(`Invalid Credential type: "${credentialType}"`),
			);
		});

		it('should return translation json on valid credential types', async () => {
			const credentialType = 'credential-type';
			const req = mock<TranslationRequest.Credential>({ query: { credentialType } });
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(true);
			const response = { translation: 'string' };
			jest.mock(`${CREDENTIAL_TRANSLATIONS_DIR}/de/credential-type.json`, () => response, {
				virtual: true,
			});

			expect(await controller.getCredentialTranslation(req)).toEqual(response);
		});
	});
});
