import { z } from 'zod';

import { zodObjectKeysMatch } from '../../../__tests__/helpers/zod-object-keys-match';
import {
	SamlConfigurationPublicDto,
	UpdateSamlConfigurationPublicDto,
} from '../saml-configuration-public.dto';
import { UpdateSamlConfigurationDto } from '../saml-preferences.dto';

const fullBody = {
	mapping: {
		email: 'user@example.com',
		firstName: 'John',
		lastName: 'Doe',
		userPrincipalName: 'johndoe',
		n8nInstanceRole: '',
		n8nProjectRoles: [] as string[],
	},
	metadata: '',
	metadataUrl: '',
	ignoreSSL: false,
	loginBinding: 'redirect' as const,
	loginEnabled: false,
	loginLabel: 'SAML',
	authnRequestsSigned: false,
	wantAssertionsSigned: true,
	wantMessageSigned: true,
	signingPrivateKey: '',
	signingCertificate: '',
	acsBinding: 'post' as const,
	signatureConfig: {
		prefix: 'ds',
		location: {
			reference: '/samlp:Response/saml:Issuer',
			action: 'after' as const,
		},
	},
	relayState: '',
};

describe('SAML public configuration DTOs', () => {
	it('keeps writable PUT keys aligned with UpdateSamlConfigurationDto', () => {
		const { entityID, returnUrl, ...writable } = UpdateSamlConfigurationPublicDto.schema.shape;

		expect(entityID).toBeDefined();
		expect(returnUrl).toBeDefined();
		expect(zodObjectKeysMatch(z.object(writable), UpdateSamlConfigurationDto.schema)).toBe(true);
	});

	it('accepts a GET response body, including read-only fields, as a PUT body', () => {
		const result = UpdateSamlConfigurationPublicDto.safeParse({
			...fullBody,
			entityID: 'https://n8n.example.com/rest/sso/saml/metadata',
			returnUrl: 'https://n8n.example.com/rest/sso/saml/acs',
		});

		expect(result.success).toBe(true);
	});

	it('rejects an unknown PUT field', () => {
		const result = UpdateSamlConfigurationPublicDto.safeParse({
			...fullBody,
			unknown: true,
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown nested mapping field', () => {
		const result = UpdateSamlConfigurationPublicDto.safeParse({
			...fullBody,
			mapping: { ...fullBody.mapping, extra: 'nope' },
		});

		expect(result.success).toBe(false);
	});

	it('requires every response field', () => {
		const result = SamlConfigurationPublicDto.safeParse(fullBody);

		expect(result.success).toBe(false);
	});
});
