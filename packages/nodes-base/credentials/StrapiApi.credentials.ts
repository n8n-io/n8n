import type { ICredentialType } from 'n8n-workflow';
import { CredentialSchema, type InferCredentialSchema } from '../utils/CredentialSchema';

export const strapiApiCredentialSchema = CredentialSchema.create({
	notice: CredentialSchema.notice('Make sure you are using a user account not an admin account'),
	email: CredentialSchema.email({ placeholder: 'name@email.com' }),
	password: CredentialSchema.password(),
	url: CredentialSchema.url({
		placeholder: 'https://api.example.com',
	}),
	apiVersion: CredentialSchema.options({
		label: 'API Version',
		description: 'The version of api to be used',
		options: [
			{
				label: 'Version 4',
				value: 'v4',
				description: 'API version supported by Strapi 4',
			},
			{
				label: 'Version 3',
				value: 'v3',
				default: true,
				description: 'API version supported by Strapi 3',
			},
		],
	}),
});

export type StrapiApiCredential = InferCredentialSchema<typeof strapiApiCredentialSchema>;

export class StrapiApi implements ICredentialType {
	name = 'strapiApi';

	displayName = 'Strapi API';

	documentationUrl = 'strapi';

	properties = strapiApiCredentialSchema.toNodeProperties();
}
