import { DatabricksOAuth2Api } from '../DatabricksOAuth2Api.credentials';

describe('DatabricksOAuth2Api Credential', () => {
	const databricksOAuth2Api = new DatabricksOAuth2Api();
	const property = (name: string) => databricksOAuth2Api.properties.find((p) => p.name === name);

	it('should have correct credential metadata', () => {
		expect(databricksOAuth2Api.name).toBe('databricksOAuth2Api');
		expect(databricksOAuth2Api.extends).toEqual(['oAuth2Api']);
	});

	describe('grantType', () => {
		const field = property('grantType');

		it('should offer exactly client credentials and authorization code', () => {
			expect(field?.type).toBe('options');
			expect(field?.options?.map((o) => 'value' in o && o.value)).toEqual([
				'clientCredentials',
				'authorizationCode',
			]);
		});

		it('should default to clientCredentials for backward compatibility', () => {
			expect(field?.default).toBe('clientCredentials');
		});
	});

	describe('OAuth URLs', () => {
		it('should build authUrl from the host with the trailing slash stripped', () => {
			const field = property('authUrl');
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe('={{$self["host"].replace(/\\/$/, "")}}/oidc/v1/authorize');
		});

		it('should build accessTokenUrl from the host with the trailing slash stripped', () => {
			const field = property('accessTokenUrl');
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe('={{$self["host"].replace(/\\/$/, "")}}/oidc/v1/token');
		});

		it('should strip the trailing slash from the credential test baseURL', () => {
			expect(databricksOAuth2Api.test.request.baseURL).toBe(
				'={{$credentials.host.replace(/\\/$/, "")}}',
			);
		});
	});

	describe('scope', () => {
		const field = property('scope');

		// Hidden is load-bearing: an editable scope property would make
		// OauthService.getOAuthCredentials keep stale stored scopes on reconnect
		it('should stay hidden and force offline_access on the authorization code grant', () => {
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe(
				'={{$self["customScopes"] ? ($self["grantType"] === "authorizationCode" ? (($self["userEnabledScopes"].trim() || "all-apis") + ($self["userEnabledScopes"].trim().split(" ").includes("offline_access") ? "" : " offline_access")) : ($self["enabledScopes"].trim() || "all-apis")) : ($self["grantType"] === "authorizationCode" ? "all-apis offline_access" : "all-apis")}}',
			);
		});

		const evaluate = (customScopes: boolean, scopes: string, grantType: string) => {
			// Evaluates the credential's real default expression, not a transcription
			// of it, so a regression in the formula fails this table directly. The
			// grant picks its own field, so `scopes` stands in for enabledScopes or
			// userEnabledScopes accordingly.
			const expression = (field?.default as string).replace(/^=\{\{/, '').replace(/\}\}$/, '');
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const evalScope = new Function('$self', `return (${expression});`) as (
				$self: Record<string, unknown>,
			) => string;
			return evalScope({
				customScopes,
				enabledScopes: scopes,
				userEnabledScopes: scopes,
				grantType,
			});
		};

		it.each([
			[false, 'all-apis', 'clientCredentials', 'all-apis'],
			[false, 'all-apis', 'authorizationCode', 'all-apis offline_access'],
			[true, 'sql files', 'clientCredentials', 'sql files'],
			[true, 'sql files', 'authorizationCode', 'sql files offline_access'],
			[true, 'sql offline_access', 'authorizationCode', 'sql offline_access'],
			// offline_access must match as a whole token, not a substring
			[
				true,
				'sql offline_access_extra',
				'authorizationCode',
				'sql offline_access_extra offline_access',
			],
			// A cleared custom-scopes field falls back to the grant's default scopes
			[true, '', 'clientCredentials', 'all-apis'],
			[true, ' ', 'authorizationCode', 'all-apis offline_access'],
		])('customScopes=%s scopes=%s %s -> %s', (customScopes, scopes, grantType, expected) => {
			expect(evaluate(customScopes, scopes, grantType)).toBe(expected);
		});
	});

	describe('custom scopes fields', () => {
		it('should default customScopes off so existing credentials keep the default scope', () => {
			const field = property('customScopes');
			expect(field?.type).toBe('boolean');
			expect(field?.default).toBe(false);
		});

		it.each([
			['customScopesNotice', 'clientCredentials'],
			['userCustomScopesNotice', 'authorizationCode'],
		])('should only show %s with customScopes on for %s', (name, grantType) => {
			expect(property(name)?.displayOptions).toEqual({
				show: { customScopes: [true], grantType: [grantType] },
			});
		});

		it('should mention offline_access only in the authorization code notice', () => {
			expect(property('customScopesNotice')?.displayName).not.toContain('offline_access');
			expect(property('userCustomScopesNotice')?.displayName).toContain('offline_access');
		});

		// One differently-named scopes field per grant type: a default can't depend
		// on another field, and the extends-chain property merge
		// (NodeHelpers.mergeNodeProperties) dedupes by name, so a same-name pair
		// would collapse to one field and never display
		it.each([
			['enabledScopes', 'clientCredentials', 'all-apis'],
			['userEnabledScopes', 'authorizationCode', 'all-apis offline_access'],
		])('should show %s for %s defaulting to %s', (name, grantType, expected) => {
			const field = property(name);
			expect(field?.displayOptions).toEqual({
				show: { customScopes: [true], grantType: [grantType] },
			});
			expect(field?.default).toBe(expected);
		});

		it('should not declare duplicate property names (the extends merge would drop one)', () => {
			const names = databricksOAuth2Api.properties.map((p) => p.name);
			expect(new Set(names).size).toBe(names.length);
		});
	});

	describe('usePkce', () => {
		const field = property('usePkce');

		// Core only consults usePkce for the authorizationCode grant, so a plain
		// hidden default is inert for service principals
		it('should be hidden and enabled by default', () => {
			expect(field?.type).toBe('hidden');
			expect(field?.default).toBe(true);
		});
	});

	describe('tokenExpiredStatusCode', () => {
		const field = property('tokenExpiredStatusCode');

		it('should be declared so it reaches the decrypted credential', () => {
			expect(field).toBeDefined();
		});

		it('should default to 403 since Databricks returns 403 for expired tokens', () => {
			expect(field?.default).toBe(403);
		});

		it('should be hidden from the credential form', () => {
			expect(field?.type).toBe('hidden');
		});
	});
});
