import type { SamlPreferences } from '@n8n/api-types';
import type { Server, Request } from 'miragejs';
import { Response } from 'miragejs';
import type { SamlPreferencesExtractedData } from '@n8n/rest-api-client/api/sso';
import { faker } from '@faker-js/faker';
import type { AppSchema } from '@/__tests__/server/types';
import { jsonParse } from 'n8n-workflow';

let samlConfig = {
	metadata: '<?xml version="1.0"?>',
	metadataUrl: '',
	entityID: faker.internet.url(),
	returnUrl: faker.internet.url(),
} as SamlPreferences & SamlPreferencesExtractedData;

export function routesForSSO(server: Server) {
	server.get('/rest/sso/saml/config', () => {
		return new Response(200, {}, { data: samlConfig });
	});

	server.post('/rest/sso/saml/config', (_schema: AppSchema, request: Request) => {
		const requestBody = jsonParse<object>(request.requestBody);

		samlConfig = {
			...samlConfig,
			...requestBody,
		};

		return new Response(200, {}, { data: samlConfig });
	});

	server.get('/rest/sso/saml/config/test', () => {
		return new Response(200, {}, { data: '<?xml version="1.0"?>' });
	});
}
