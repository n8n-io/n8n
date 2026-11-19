import { describe, it, expect } from 'vitest';

import { credentialTypeIcon, FALLBACK_TYPE_ICON } from './credentialTypeIcon';
import type { CredentialTypeSummary } from '../type-availability-policies.api';

const types = new Map<string, CredentialTypeSummary>([
	['airtableApi', { displayName: 'Airtable API', iconUrl: 'icons/airtable.svg' }],
	[
		'githubApi',
		{
			displayName: 'GitHub API',
			iconUrl: { light: 'icons/github.svg', dark: 'icons/github.dark.svg' },
		},
	],
	['ftp', { displayName: 'FTP', icon: 'node:ftp' }],
	['httpHeaderAuth', { displayName: 'Header Auth', icon: 'node:n8n-nodes-base.httpRequest' }],
	['totpApi', { displayName: 'TOTP API', icon: 'fa:fingerprint', iconColor: 'gray' }],
	['oAuth2Api', { displayName: 'OAuth2 API', icon: 'fa:key' }],
	['braveSearchApi', { displayName: 'Brave Search API', extends: ['missing', 'oAuth2Api'] }],
	['loopA', { displayName: 'Loop A', extends: ['loopB'] }],
	['loopB', { displayName: 'Loop B', extends: ['loopA'] }],
]);

const icon = (name: string, theme: 'light' | 'dark' = 'light') =>
	credentialTypeIcon(types, name, theme, '/base/');

describe('credentialTypeIcon', () => {
	it('uses the icon file under the base URL', () => {
		expect(icon('airtableApi')).toEqual({ type: 'file', src: '/base/icons/airtable.svg' });
	});

	it('uses the icon file of the current theme', () => {
		expect(icon('githubApi', 'dark')).toEqual({
			type: 'file',
			src: '/base/icons/github.dark.svg',
		});
	});

	it('uses a named icon with its color', () => {
		expect(icon('totpApi')).toEqual({
			type: 'icon',
			name: 'fingerprint',
			color: 'var(--node--icon--color--gray)',
		});
		expect(icon('ftp')).toEqual({ type: 'icon', name: 'node:ftp', color: undefined });
	});

	it('uses the generic icon for an icon that names a node type', () => {
		expect(icon('httpHeaderAuth')).toBe(FALLBACK_TYPE_ICON);
	});

	it('uses the icon of the first parent type that has one', () => {
		expect(icon('braveSearchApi')).toEqual({ type: 'icon', name: 'key', color: undefined });
	});

	it('returns nothing for a type without an icon, also when its parents form a loop', () => {
		expect(icon('loopA')).toBeUndefined();
		expect(icon('unknownApi')).toBeUndefined();
	});
});
