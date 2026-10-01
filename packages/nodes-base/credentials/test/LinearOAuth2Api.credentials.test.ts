import { LinearOAuth2Api } from '../LinearOAuth2Api.credentials';

describe('LinearOAuth2Api Credential', () => {
	const credential = new LinearOAuth2Api();

	it('requests app mentionable scope when authenticating as the application actor', () => {
		const scopeProperty = credential.properties.find((property) => property.name === 'scope');

		expect(scopeProperty?.default).toContain('$self["actor"] === "app"');
		expect(scopeProperty?.default).toContain('app:mentionable');
	});
});
