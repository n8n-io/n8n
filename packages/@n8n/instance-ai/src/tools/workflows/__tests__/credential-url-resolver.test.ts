import type { CredentialHostInfo } from '../../../types';
import {
	deriveCredentialHosts,
	buildCredentialHostIndex,
	resolveCredentialByUrl,
} from '../credential-url-resolver';

describe('deriveCredentialHosts', () => {
	it('reads a literal httpRequestNode.apiBaseUrlPlaceholder', () => {
		expect(
			deriveCredentialHosts({
				httpRequestNode: { apiBaseUrlPlaceholder: 'https://api.datadoghq.com/api/v1/metrics' },
			}),
		).toEqual(['api.datadoghq.com']);
	});

	it('reads a literal test.request.baseURL', () => {
		expect(
			deriveCredentialHosts({ test: { request: { baseURL: 'https://api.stripe.com/v1' } } }),
		).toEqual(['api.stripe.com']);
	});

	it('resolves a {{$credentials.url}} template to the property default (the AI-provider case)', () => {
		expect(
			deriveCredentialHosts({
				test: { request: { baseURL: '={{$credentials.url}}/v1/models' } },
				properties: [{ name: 'url', default: 'https://api.openai.com/v1' }],
			}),
		).toEqual(['api.openai.com']);
	});

	it('handles the optional-chaining template form {{$credentials?.url}}', () => {
		expect(
			deriveCredentialHosts({
				test: { request: { baseURL: '={{$credentials?.url}}' } },
				properties: [{ name: 'url', default: 'https://api.anthropic.com' }],
			}),
		).toEqual(['api.anthropic.com']);
	});

	it('returns [] for a self-hosted credential (template with no concrete default)', () => {
		expect(
			deriveCredentialHosts({
				test: { request: { baseURL: '={{$credentials.url}}' } },
				properties: [{ name: 'url', default: '' }],
			}),
		).toEqual([]);
	});

	it('skips placeholder hosts that contain a {segment}', () => {
		expect(
			deriveCredentialHosts({
				httpRequestNode: { apiBaseUrlPlaceholder: 'https://{subdomain}.sharepoint.com/' },
			}),
		).toEqual([]);
	});

	it('falls back to a URL-ish property default when no test/httpRequestNode host', () => {
		expect(
			deriveCredentialHosts({ properties: [{ name: 'host', default: 'https://api.groq.com' }] }),
		).toEqual(['api.groq.com']);
	});

	it('returns [] when nothing concrete is declared', () => {
		expect(deriveCredentialHosts({ properties: [{ name: 'apiKey', default: '' }] })).toEqual([]);
	});
});

describe('buildCredentialHostIndex', () => {
	it('indexes hosts to credential types and flags multiple types per host', () => {
		const infos: CredentialHostInfo[] = [
			{ type: 'stripeApi', hosts: ['api.stripe.com'] },
			{ type: 'facebookGraphApi', hosts: ['graph.facebook.com'] },
			{ type: 'whatsAppApi', hosts: ['graph.facebook.com'] },
		];
		const index = buildCredentialHostIndex(infos);
		expect(index.get('api.stripe.com')).toEqual(['stripeApi']);
		expect(index.get('graph.facebook.com')).toEqual(['facebookGraphApi', 'whatsAppApi']);
	});
});

describe('resolveCredentialByUrl', () => {
	const index = buildCredentialHostIndex([
		{ type: 'stripeApi', hosts: ['api.stripe.com'] },
		{ type: 'facebookGraphApi', hosts: ['graph.facebook.com'] },
		{ type: 'whatsAppApi', hosts: ['graph.facebook.com'] },
	]);

	it('matches a single credential for a known host', () => {
		expect(resolveCredentialByUrl('https://api.stripe.com/v1/charges', index)).toEqual({
			status: 'match',
			credentialType: 'stripeApi',
		});
	});

	it('extracts the host from an expression URL', () => {
		expect(
			resolveCredentialByUrl('={{ "https://api.stripe.com/v1/" + $json.path }}', index),
		).toEqual({ status: 'match', credentialType: 'stripeApi' });
	});

	it('returns ambiguous when a host maps to multiple credentials', () => {
		expect(resolveCredentialByUrl('https://graph.facebook.com/v19.0/me', index)).toEqual({
			status: 'ambiguous',
			candidates: ['facebookGraphApi', 'whatsAppApi'],
		});
	});

	it('returns none for an unknown host', () => {
		expect(resolveCredentialByUrl('https://queue.fal.run/x', index)).toEqual({ status: 'none' });
	});

	it('returns none when no host can be extracted', () => {
		expect(resolveCredentialByUrl('not-a-url', index)).toEqual({ status: 'none' });
	});
});
