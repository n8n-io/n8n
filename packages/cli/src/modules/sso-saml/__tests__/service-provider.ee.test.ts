import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { getServiceProviderEntityId, getServiceProviderReturnUrl } from '../service-provider.ee';

describe('service provider URLs', () => {
	const globalConfig = Container.get(GlobalConfig);
	const defaultRestEndpoint = globalConfig.endpoints.rest;

	beforeAll(() => {
		Container.set(
			UrlService,
			mock<UrlService>({ getInstanceBaseUrl: () => 'https://n8n.example.com' }),
		);
	});

	afterEach(() => {
		globalConfig.endpoints.rest = defaultRestEndpoint;
	});

	test('use the default REST path', () => {
		expect(getServiceProviderEntityId()).toBe('https://n8n.example.com/rest/sso/saml/metadata');
		expect(getServiceProviderReturnUrl()).toBe('https://n8n.example.com/rest/sso/saml/acs');
	});

	test('put the ACS URL under a configured REST path and keep the Entity ID', () => {
		globalConfig.endpoints.rest = 'api';

		expect(getServiceProviderReturnUrl()).toBe('https://n8n.example.com/api/sso/saml/acs');
		expect(getServiceProviderEntityId()).toBe('https://n8n.example.com/rest/sso/saml/metadata');
	});
});
