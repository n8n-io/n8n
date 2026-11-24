import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { CredentialOptionsController } from '../credential-options.controller';

describe('Credential resource locator route access', () => {
	const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		CredentialOptionsController as Controller,
	);

	it.each([
		['lookupProjectDraft', 'credential:create', false],
		['lookupInstanceDraft', 'credential:manageInstance', true],
		['lookupStored', 'credential:read', false],
	])('%s requires %s', (handler, scope, globalOnly) => {
		expect(routes.get(handler)?.accessScope).toEqual({ scope, globalOnly });
		expect(routes.get(handler)?.skipAuth).not.toBe(true);
	});
});
