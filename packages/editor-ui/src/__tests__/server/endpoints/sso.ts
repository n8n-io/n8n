import type { Server, Request } from 'miragejs';
import { Response } from 'miragejs';
import type { SamlPreferences, SamlPreferencesExtractedData } from '@/Interface';
import { faker } from '@faker-js/faker';
import type { AppSchema } from '@/__tests__/server/types';
import { jsonParse } from 'n8n-workflow';

let samlConfig: SamlPreferences & SamlPreferencesExtractedData = {
	metadata: '<?xml version="1.0"?>',
	metadataUrl: '',
	entityID: faker.internet.url(),
	returnUrl: faker.internet.url(),
};

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
