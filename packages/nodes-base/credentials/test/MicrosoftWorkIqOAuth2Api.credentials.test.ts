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
		it('asks for read and ask access plus a refresh token', () => {
			expect(evaluate('scope', { allowWriteAccess: false }).split(' ')).toEqual([
				`${WORK_IQ_RESOURCE_ID}/WorkIQAgent.Ask`,
				`${WORK_IQ_RESOURCE_ID}/WorkIQ.Read`,
				'offline_access',
			]);
		});

		it('adds WorkIQ.Act only when write access is switched on', () => {
			expect(propertyNamed('allowWriteAccess')?.default).toBe(false);
			expect(evaluate('scope', { allowWriteAccess: true })).toContain(
				`${WORK_IQ_RESOURCE_ID}/WorkIQ.Act`,
			);
		});

		it.each([false, undefined, '', 'false', 0])(
			'withholds WorkIQ.Act for %j, so only the toggle can widen consent',
			(allowWriteAccess) => {
				expect(evaluate('scope', { allowWriteAccess })).not.toContain('WorkIQ.Act');
			},
		);

		it('qualifies every Work IQ permission with the resource ID', () => {
			// Entra rejects the bare `WorkIQ.Read` form Microsoft's setup docs use.
			const workIqScopes = evaluate('scope', { allowWriteAccess: true })
				.split(' ')
				.filter((scope) => scope !== 'offline_access');

			expect(workIqScopes).toHaveLength(3);
			for (const scope of workIqScopes) {
				expect(scope.startsWith(`${WORK_IQ_RESOURCE_ID}/`)).toBe(true);
			}
		});
	});

	describe('inherited fields', () => {
		it('hides the Graph base URL, which Work IQ never calls', () => {
			expect(propertyNamed('graphApiBaseUrl')?.type).toBe('hidden');
		});

		it('leaves the delegated grant type and account picker as microsoftOAuth2Api sets them', () => {
			// The parent already pins grantType to authorizationCode and sends
			// prompt=select_account. Work IQ has no app-only mode, so both are right.
			expect(propertyNamed('grantType')).toBeUndefined();
			expect(propertyNamed('authQueryParameters')).toBeUndefined();
		});
	});
});
