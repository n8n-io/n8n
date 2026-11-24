import { MicrosoftTeamsManagerOAuth2Api } from '../MicrosoftTeamsManagerOAuth2Api.credentials';
import { MicrosoftTeamsOAuth2Api } from '../MicrosoftTeamsOAuth2Api.credentials';

describe('MicrosoftTeamsManagerOAuth2Api Credential', () => {
	const credential = new MicrosoftTeamsManagerOAuth2Api();
	const defaultOf = (name: string) =>
		credential.properties.find((property) => property.name === name)?.default;

	it('is a hidden setup-only credential that no node can use', () => {
		expect(credential.name).toBe('microsoftTeamsManagerOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
		expect(credential.hidden).toBe(true);
		expect(credential.restrictToSupportedNodes).toBe(true);
		expect(credential.supportedNodes).toEqual([]);
	});

	/**
	 * `organizations`, not `common`: both admit any work or school tenant, and
	 * only `common` also admits a personal account, which has no Teams
	 * organisation to set anything up in.
	 */
	it('signs in against the multi-tenant endpoints, minus personal accounts', () => {
		expect(defaultOf('authUrl')).toBe(
			'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
		);
		expect(defaultOf('accessTokenUrl')).toBe(
			'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
		);
		expect(String(defaultOf('authUrl'))).not.toContain('/common/');
	});

	it('asks for the Graph permissions the setup needs', () => {
		const scope = String(defaultOf('scope'));
		expect(scope.split(' ')).toEqual(
			expect.arrayContaining([
				'offline_access',
				'https://graph.microsoft.com/Application.ReadWrite.All',
				'https://graph.microsoft.com/AppCatalog.ReadWrite.All',
				'https://graph.microsoft.com/AppCatalog.Submit',
			]),
		);
	});

	/**
	 * A code is redeemed for one resource, and n8n sends no scope on the
	 * redemption, so naming Azure here leaves it ambiguous and Entra answers
	 * `invalid_request`. The Azure token comes from the refresh token instead.
	 */
	it('names only one resource, so the code can be redeemed', () => {
		const resources = new Set(
			String(defaultOf('scope'))
				.split(' ')
				.filter((entry) => entry.startsWith('https://'))
				.map((entry) => new URL(entry).origin),
		);

		expect([...resources]).toEqual(['https://graph.microsoft.com']);
	});

	/**
	 * n8n publishes the app to the organisation catalogue. It installs nothing
	 * for anyone and never reads back what they have, so neither write nor read
	 * over their apps is asked for.
	 */
	it("asks for nothing over the user's apps", () => {
		const scope = String(defaultOf('scope'));

		expect(scope).not.toContain('TeamsAppInstallation');
	});

	it('keeps a refresh token, without which the Azure token cannot be minted', () => {
		expect(String(defaultOf('scope'))).toContain('offline_access');
	});
});

describe('MicrosoftTeamsOAuth2Api, the node credential it must not disturb', () => {
	const nodeCredential = new MicrosoftTeamsOAuth2Api();

	/**
	 * The setup permissions are admin-consent-only. Putting them on the node's
	 * credential would face every existing Teams node user with a consent prompt
	 * for something they never asked for, which is why the setup has its own type.
	 */
	it('carries none of the setup permissions', () => {
		const scope = nodeCredential.properties.find((property) => property.name === 'scope')?.default;

		// Asserted first: with `?? ''` as a fallback, a renamed or dropped
		// property would make every absence check below pass on an empty string.
		expect(typeof scope).toBe('string');
		expect(scope).not.toContain('Application.ReadWrite.All');
		expect(scope).not.toContain('AppCatalog');
		expect(scope).not.toContain('management.azure.com');
	});

	it('is a different credential type from the setup one', () => {
		expect(nodeCredential.name).not.toBe(new MicrosoftTeamsManagerOAuth2Api().name);
	});
});
