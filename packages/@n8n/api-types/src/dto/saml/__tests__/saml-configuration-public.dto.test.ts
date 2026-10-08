import { z } from 'zod';

import {
	zodObjectFieldsAreAllRequired,
	zodObjectKeysMatch,
} from '../../../__tests__/helpers/zod-object-keys-match';
import {
	SamlConfigurationPublicDto,
	UpdateSamlConfigurationPublicDto,
} from '../saml-configuration-public.dto';
import { UpdateSamlConfigurationDto } from '../saml-preferences.dto';

const fullBody: z.input<typeof UpdateSamlConfigurationPublicDto.schema> = {
	mapping: {
		email: 'user@example.com',
		firstName: 'John',
		lastName: 'Doe',
		userPrincipalName: 'johndoe',
		emailVerified: '',
		n8nInstanceRole: '',
		n8nProjectRoles: [],
	},
	metadata: '',
	metadataUrl: '',
	ignoreSSL: false,
	loginBinding: 'redirect',
	loginEnabled: false,
	loginLabel: 'SAML',
	authnRequestsSigned: false,
	wantAssertionsSigned: true,
	wantMessageSigned: true,
	emailVerifiedRequired: false,
	signingPrivateKey: '',
	signingCertificate: '',
	acsBinding: 'post',
	signatureConfig: {
		prefix: 'ds',
		location: {
			reference: '/samlp:Response/saml:Issuer',
			action: 'after',
		},
	},
	relayState: '',
};

describe('SAML public configuration DTOs', () => {
	describe('UpdateSamlConfigurationPublicDto', () => {
		it('keeps writable keys aligned with UpdateSamlConfigurationDto', () => {
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

		it('rejects an unknown field', () => {
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
	});

	describe('SamlConfigurationPublicDto', () => {
		it('requires every field', () => {
			expect(zodObjectFieldsAreAllRequired(SamlConfigurationPublicDto.schema)).toBe(true);
		});

		it('keeps keys aligned with the writable configuration plus the read-only fields', () => {
			expect(
				zodObjectKeysMatch(
					SamlConfigurationPublicDto.schema,
					z.object({
						entityID: z.string(),
						returnUrl: z.string(),
						...UpdateSamlConfigurationDto.schema.shape,
					}),
				),
			).toBe(true);
		});
	});
});
