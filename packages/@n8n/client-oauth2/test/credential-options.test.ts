import { resolveClientAuthOptions } from '@/credential-options';

describe('resolveClientAuthOptions', () => {
	it('returns the client secret in secret mode', () => {
		expect(
			resolveClientAuthOptions({ clientCredentialType: 'clientSecret', clientSecret: 'secret' }),
		).toEqual({ clientCredentialType: 'clientSecret', clientSecret: 'secret' });
	});

	it('attaches the certificate and drops the secret in certificate mode', () => {
		expect(
			resolveClientAuthOptions({
				clientCredentialType: 'certificate',
				clientSecret: 'stale-secret',
				privateKey: 'pk',
				certificate: 'cert',
			}),
		).toEqual({
			clientCredentialType: 'certificate',
			clientCertificate: { privateKey: 'pk', certificate: 'cert' },
		});
	});

	it('omits the certificate (and the secret) when a PEM is missing in certificate mode', () => {
		expect(
			resolveClientAuthOptions({
				clientCredentialType: 'certificate',
				clientSecret: 'stale-secret',
				privateKey: 'pk',
				certificate: '',
			}),
		).toEqual({ clientCredentialType: 'certificate' });
	});
});
