import type { ICredentialType } from 'n8n-workflow';

import { MicrosoftWorkIqOAuth2Api } from '../MicrosoftWorkIqOAuth2Api.credentials';

const WORK_IQ_RESOURCE_ID = 'fdcc1f02-fc51-4226-8753-f668596af7f7';

describe('MicrosoftWorkIqOAuth2Api Credential', () => {
	const credential = new MicrosoftWorkIqOAuth2Api();

	const propertyNamed = (name: string) =>
		credential.properties.find((property) => property.name === name);

	// Evaluates the shipped expression rather than a copy of its logic, so the
	// assertions cannot drift from the credential.
	const evaluate = (name: string, self: Record<string, unknown>): string => {
		const body = String(propertyNamed(name)?.default ?? '')
			.replace(/^=\{\{/, '')
			.replace(/\}\}$/, '');
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		return new Function('$self', `return ${body}`)(self) as string;
	};

	describe('MCP registry compatibility', () => {
		it('declares no authenticate or preAuthentication', () => {
			// isSupportedMcpRegistryCredentialType drops the whole registry row if
			// either is present, with no error the author would ever see.
			const { authenticate, preAuthentication } = credential as ICredentialType;
			expect(authenticate).toBeUndefined();
			expect(preAuthentication).toBeUndefined();
		});

		it('is named and extended so the registry accepts it as an OAuth2 parent', () => {
			expect(credential.name).toBe('microsoftWorkIqOAuth2Api');
			expect(credential.name.endsWith('OAuth2Api')).toBe(true);
			expect(credential.extends).toEqual(['microsoftOAuth2Api']);
		});

		it('pins its identity fields', () => {
			expect(credential.displayName).toBe('Microsoft Work IQ OAuth2 API');
			expect(credential.documentationUrl).toBe('microsoftworkiq');
			expect(credential.icon).toBe('file:icons/Microsoft.svg');
		});
	});

	describe('tenant', () => {
		it('defaults to organizations and is required', () => {
			// Not "common": that admits personal accounts, which cannot have Work IQ.
			expect(propertyNamed('tenantId')?.default).toBe('organizations');
			expect(propertyNamed('tenantId')?.required).toBe(true);
		});

		it.each([
			'organizations',
			'ccddc63f-19cd-4bb6-86e1-ace3c5e8aefa',
			'contoso.onmicrosoft.com',
			'  ccddc63f-19cd-4bb6-86e1-ace3c5e8aefa  ',
		])('builds both Entra URLs from tenant %j', (tenantId) => {
			const base = `https://login.microsoftonline.com/${tenantId.trim()}/oauth2/v2.0`;
			expect(evaluate('authUrl', { tenantId })).toBe(`${base}/authorize`);
			expect(evaluate('accessTokenUrl', { tenantId })).toBe(`${base}/token`);
		});
	});

	describe('scope', () => {
		it('always asks for agent access plus a refresh token', () => {
			expect(evaluate('scope', { allowDirectChanges: false }).split(' ')).toEqual([
				`${WORK_IQ_RESOURCE_ID}/WorkIQAgent.Ask`,
				`${WORK_IQ_RESOURCE_ID}/WorkIQ.Read`,
				'offline_access',
			]);
		});

		it('requests the agent scope unconditionally and says it carries write', () => {
			// Microsoft documents WorkIQAgent.Ask as including read AND write access to
			// Microsoft 365. Since it is always requested, the credential has to warn
			// rather than imply that leaving the toggle off yields a read-only connection.
			expect(evaluate('scope', { allowDirectChanges: false })).toContain(
				`${WORK_IQ_RESOURCE_ID}/WorkIQAgent.Ask`,
			);

			const notice = propertyNamed('accessNotice');
			expect(notice?.type).toBe('notice');
			expect(notice?.displayName).toMatch(/read and write access/i);
		});

		it('adds WorkIQ.Act only when direct changes are switched on', () => {
			expect(propertyNamed('allowDirectChanges')?.default).toBe(false);
			expect(evaluate('scope', { allowDirectChanges: true })).toContain(
				`${WORK_IQ_RESOURCE_ID}/WorkIQ.Act`,
			);
		});

		it.each([false, undefined, '', 'false', 0])(
			'withholds WorkIQ.Act for %j, so only the toggle adds it',
			(allowDirectChanges) => {
				expect(evaluate('scope', { allowDirectChanges })).not.toContain('WorkIQ.Act');
			},
		);

		it('qualifies every Work IQ permission with the resource ID', () => {
			// The server advertises this qualified form in its protected resource metadata.
			const workIqScopes = evaluate('scope', { allowDirectChanges: true })
				.split(' ')
				.filter((scope) => scope !== 'offline_access');

			expect(workIqScopes).toHaveLength(3);
			for (const scope of workIqScopes) {
				expect(scope.startsWith(`${WORK_IQ_RESOURCE_ID}/`)).toBe(true);
			}
		});
	});

	describe('inherited fields', () => {
		it.each(['authUrl', 'accessTokenUrl', 'scope', 'graphApiBaseUrl'])(
			'keeps %s hidden so the credential type wins over a stored value',
			(name) => {
				expect(propertyNamed(name)?.type).toBe('hidden');
			},
		);

		it('leaves the delegated grant type and account picker as microsoftOAuth2Api sets them', () => {
			// The parent already pins grantType to authorizationCode and sends
			// prompt=select_account. Work IQ has no app-only mode, so both are right.
			expect(propertyNamed('grantType')).toBeUndefined();
			expect(propertyNamed('authQueryParameters')).toBeUndefined();
		});
	});
});
