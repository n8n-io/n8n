import type { CreateRuntimeCredentialRuleDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { RuntimeCredentialRuleRepository } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import type { CredentialFieldTargetValidator } from '../credential-field-target';
import { RuntimeCredentialRulesService } from '../runtime-credential-rules.service';
import type { RuntimeCredentialStubSeeder } from '../runtime-credential-stub.seeder';
import type { RuntimeCredentialsService } from '../runtime-credentials.service';

describe('RuntimeCredentialRulesService target validation', () => {
	const rulesService = mock<RuntimeCredentialsService>();
	const repository = mock<RuntimeCredentialRuleRepository>();
	const credentialTypes = mock<CredentialTypes>();
	const validator = mock<CredentialFieldTargetValidator>();
	const service = new RuntimeCredentialRulesService(
		mock<Logger>(),
		rulesService,
		repository,
		credentialTypes,
		mock<RuntimeCredentialStubSeeder>(),
		validator,
	);

	const dto = {
		alias: 'a',
		nodeType: '*',
		path: 'headers.x',
		credentialType: 'oAuth2Api',
		transform: 'field:authUrl',
	} as CreateRuntimeCredentialRuleDto;

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		rulesService.isEnvironmentRule.mockReturnValue(false);
	});

	it('returns 400 with the reason on create and stores nothing', async () => {
		validator.getError.mockReturnValue('The field "authUrl" is controlled by n8n');

		const result = service.create(dto);
		await expect(result).rejects.toThrow(BadRequestError);
		await expect(result).rejects.toThrow('The field "authUrl" is controlled by n8n');
		expect(validator.getError).toHaveBeenCalledWith('oAuth2Api', 'field:authUrl');
		expect(repository.insertRule).not.toHaveBeenCalled();
	});

	it('checks a patched transform against the stored credential type', async () => {
		repository.findByAlias.mockResolvedValue({ alias: 'a', credentialType: 'oAuth2Api' } as never);
		validator.getError.mockReturnValue('Credential type "oAuth2Api" has no field "x"');

		await expect(service.update('a', { transform: 'field:x' })).rejects.toThrow(
			'Credential type "oAuth2Api" has no field "x"',
		);
		expect(validator.getError).toHaveBeenCalledWith('oAuth2Api', 'field:x');
		expect(repository.updateByAlias).not.toHaveBeenCalled();
	});

	it('does not check a patch that leaves the transform alone or clears it', async () => {
		repository.findByAlias.mockResolvedValue({ alias: 'a', credentialType: 'oAuth2Api' } as never);
		rulesService.getCredentialRules.mockReturnValue([
			['a', { nodeType: '*', path: 'p', credentialType: 'oAuth2Api' }],
		]);

		await service.update('a', { path: 'p' });
		await service.update('a', { transform: null });

		expect(validator.getError).not.toHaveBeenCalled();
	});
});
