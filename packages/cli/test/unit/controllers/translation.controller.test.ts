import { mock } from 'jest-mock-extended';
import type { ICredentialTypes } from 'n8n-workflow';
import type { Config } from '@/config';
import type { TranslationRequest } from '@/controllers/translation.controller';
import {
	TranslationController,
	CREDENTIAL_TRANSLATIONS_DIR,
} from '@/controllers/translation.controller';
import { BadRequestError } from '@/ResponseHelper';

describe('TranslationController', () => {
	const config = mock<Config>();
	const credentialTypes = mock<ICredentialTypes>();
	const controller = new TranslationController(config, credentialTypes);

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
			config.getEnv.calledWith('defaultLocale').mockReturnValue('de');
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(true);
			const response = { translation: 'string' };
			jest.mock(`${CREDENTIAL_TRANSLATIONS_DIR}/de/credential-type.json`, () => response, {
				virtual: true,
			});

			expect(await controller.getCredentialTranslation(req)).toEqual(response);
		});
	});
});
