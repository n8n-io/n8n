import { AsanaOAuth2Api } from '../AsanaOAuth2Api.credentials';

describe('AsanaOAuth2Api Credential', () => {
	const credential = new AsanaOAuth2Api();

	it('should keep the empty scope default for apps with Full permissions', () => {
		const scopeProperty = credential.properties.find((property) => property.name === 'scope');

		expect(scopeProperty?.default).toBe('');
		expect(scopeProperty?.required).not.toBe(true);
	});

	it('should let users enter scopes for apps with specific permissions', () => {
		const scopeProperty = credential.properties.find((property) => property.name === 'scope');

		// NODE-6201: Apps with specific permissions need an editable scope, such as tasks:write.
		expect(scopeProperty).toBeDefined();
		expect(scopeProperty?.type).toBe('string');
	});
});
