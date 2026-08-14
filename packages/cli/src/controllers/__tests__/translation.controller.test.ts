import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { TranslationRequest } from '@/controllers/translation.controller';
import { TranslationController } from '@/controllers/translation.controller';
import type { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

// The controller loads the translation file via `require(<computed path>)`.
// Vitest cannot mock a path that doesn't resolve to a real module, so write a
// real fixture and point `safeJoinPath` at it. The fixture is created in a
// hoisted block because the mock factory below is hoisted above module init.
const { fixturePath } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { mkdtempSync, writeFileSync } = require('fs');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { tmpdir } = require('os');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { join } = require('path');
	const dir = mkdtempSync(join(tmpdir(), 'translations-'));
	const p = join(dir, 'credential-type.json');
	writeFileSync(p, JSON.stringify({ translation: 'string' }));
	return { fixturePath: p as string };
});

vi.mock('@n8n/backend-common', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/backend-common')>();
	return {
		...actual,
		safeJoinPath: vi.fn((...args: string[]) =>
			args.some((a) => a.endsWith('credential-type.json'))
				? fixturePath
				: (actual.safeJoinPath as (...a: string[]) => string)(...args),
		),
	};
});

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

			const execution = controller.getCredentialTranslation(req);

			await expect(execution).rejects.toThrow(BadRequestError);
			await expect(execution).rejects.toThrow(`Invalid Credential type: "${credentialType}"`);
		});

		it('should return translation json on valid credential types', async () => {
			const credentialType = 'credential-type';
			const req = mock<TranslationRequest.Credential>({ query: { credentialType } });
			credentialTypes.recognizes.calledWith(credentialType).mockReturnValue(true);
			const response = { translation: 'string' };

			expect(await controller.getCredentialTranslation(req)).toEqual(response);
		});
	});
});
