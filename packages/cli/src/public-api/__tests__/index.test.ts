import type { OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';

import { patchOpenApiServers } from '@/public-api';

describe('patchOpenApiServers', () => {
	const document = {
		openapi: '3.0.0',
		info: { title: 'n8n Public API', version: '1.0.0' },
		paths: {},
		servers: [{ url: '/api/v1' }, { url: 'https://api.example.com/api/v1' }],
	} satisfies OpenAPIV3.DocumentV3;

	it('should prepend the base path to relative server urls', () => {
		const patched = patchOpenApiServers(document, '/n8n');

		expect(patched.servers).toEqual([
			{ url: '/n8n/api/v1' },
			{ url: 'https://api.example.com/api/v1' },
		]);
	});

	it('should leave server urls unchanged for root base path', () => {
		expect(patchOpenApiServers(document, '/').servers).toEqual(document.servers);
	});
});
