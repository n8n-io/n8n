import { readFileSync } from 'fs';
import type { ICredentialType } from 'n8n-workflow';
import { resolve } from 'path';

import { MicrosoftWorkIqOAuth2Api } from '../MicrosoftWorkIqOAuth2Api.credentials';

const RESOURCE = 'api://workiq.svc.cloud.microsoft';

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
			// The gate requires a name ending in OAuth2Api and oAuth2Api in the chain.
			expect(credential.name).toBe('microsoftWorkIqOAuth2Api');
			expect(credential.extends).toEqual(['microsoftOAuth2Api']);
		});

		it('pins its identity fields', () => {
			expect(credential.displayName).toBe('Microsoft Work IQ OAuth2 API');
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
		// Exact sets, not substring checks. A looser assertion let a mutation that
		// moved offline_access into one branch pass the whole suite.
		const EXPECTED: Record<string, string[]> = {
			agent: [`${RESOURCE}/WorkIQAgent.Ask`, 'offline_access'],
			read: [`${RESOURCE}/WorkIQAgent.Ask`, `${RESOURCE}/WorkIQ.Read`, 'offline_access'],
			act: [`${RESOURCE}/WorkIQAgent.Ask`, `${RESOURCE}/WorkIQ.Act`, 'offline_access'],
		};

		it.each(Object.entries(EXPECTED))('requests exactly the %s scope set', (accessLevel, want) => {
			expect(evaluate('scope', { accessLevel }).split(' ')).toEqual(want);
		});

		it('defaults to the permission Microsoft tells admins to grant', () => {
			// The Work IQ MCP quickstart grants WorkIQAgent.Ask alone. Asking for more
			// by default fails sign-in with AADSTS65001 in a tenant set up that way.
			expect(propertyNamed('accessLevel')?.default).toBe('agent');
			expect(evaluate('scope', { accessLevel: 'agent' })).toBe(
				`${RESOURCE}/WorkIQAgent.Ask offline_access`,
			);
		});

		it.each([undefined, '', 'nonsense'])(
			'falls back to the baseline scope set for %j',
			(accessLevel) => {
				expect(evaluate('scope', { accessLevel })).toBe(
					`${RESOURCE}/WorkIQAgent.Ask offline_access`,
				);
			},
		);

		it('never drops the agent scope or the refresh token', () => {
			// Ask is what the MCP endpoint itself advertises; offline_access is what
			// keeps the connection alive past the first hour.
			for (const accessLevel of Object.keys(EXPECTED)) {
				const scopes = evaluate('scope', { accessLevel }).split(' ');
				expect(scopes).toContain(`${RESOURCE}/WorkIQAgent.Ask`);
				expect(scopes).toContain('offline_access');
			}
		});

		it('says plainly that the always-present agent scope carries write', () => {
			// Microsoft documents WorkIQAgent.Ask as including read AND write, so no
			// field may imply that the default level is read-only.
			const notice = propertyNamed('accessNotice');
			expect(notice?.type).toBe('notice');
			expect(notice?.displayName).toMatch(/read and write access/i);
		});
	});

	describe('inherited fields', () => {
		it.each(['authUrl', 'accessTokenUrl', 'scope', 'graphApiBaseUrl'])(
			'keeps %s hidden from the credential modal',
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

	it('is registered in package.json, or n8n never loads it', () => {
		const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
			n8n: { credentials: string[] };
		};

		expect(manifest.n8n.credentials).toContain(
			'dist/credentials/MicrosoftWorkIqOAuth2Api.credentials.js',
		);
	});
});
