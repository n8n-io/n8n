import type { ClientCertificate, OAuth2ClientCredentialType } from './types';

interface ClientAuthCredential {
	clientCredentialType?: OAuth2ClientCredentialType;
	clientSecret?: string;
	privateKey?: string;
	certificate?: string;
}

interface ClientAuthOptions {
	clientCredentialType?: OAuth2ClientCredentialType;
	clientSecret?: string;
	clientCertificate?: ClientCertificate;
}

/**
 * Resolves the client-authentication options for `ClientOAuth2` from credential data.
 * In certificate mode the client uses a signed assertion, so the (possibly stale) secret is
 * dropped; the certificate is attached only when both PEMs are present (otherwise the token
 * request fails with a clear "missing certificate" error from the flow).
 */
export function resolveClientAuthOptions(credential: ClientAuthCredential): ClientAuthOptions {
	if (credential.clientCredentialType === 'certificate') {
		const usesCertificate = !!credential.privateKey && !!credential.certificate;
		return {
			clientCredentialType: 'certificate',
			...(usesCertificate && {
				clientCertificate: {
					privateKey: credential.privateKey as string,
					certificate: credential.certificate as string,
				},
			}),
		};
	}

	return {
		clientCredentialType: credential.clientCredentialType,
		clientSecret: credential.clientSecret,
	};
}
