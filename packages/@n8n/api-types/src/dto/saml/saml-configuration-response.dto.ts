/**
 * Public API response shape for the SAML SSO configuration group.
 * Matches the PUT body plus read-only service-provider fields so a GET
 * response can be sent back as a PUT body.
 */
export type SamlConfigurationResponse = {
	mapping: {
		email: string;
		firstName: string;
		lastName: string;
		userPrincipalName: string;
		n8nInstanceRole: string;
		n8nProjectRoles: string[];
	};
	metadata: string;
	metadataUrl: string;
	ignoreSSL: boolean;
	loginBinding: 'redirect' | 'post';
	loginEnabled: boolean;
	loginLabel: string;
	authnRequestsSigned: boolean;
	wantAssertionsSigned: boolean;
	wantMessageSigned: boolean;
	signingPrivateKey: string;
	signingCertificate: string;
	acsBinding: 'redirect' | 'post';
	signatureConfig: {
		prefix: string;
		location: {
			reference: string;
			action: 'before' | 'after' | 'prepend' | 'append';
		};
	};
	relayState: string;
	entityID: string;
	returnUrl: string;
};
