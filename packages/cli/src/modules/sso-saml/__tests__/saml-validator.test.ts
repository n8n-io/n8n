import { mock } from 'jest-mock-extended';

import { SamlValidator } from '../saml-validator';

describe('saml-validator', () => {
	const validator = new SamlValidator(mock());
	const VALID_CERTIFICATE =
		'MIIC8DCCAdigAwIBAgIQf+iroClVKohAtsyk0Ne13TANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQDEylNaWNyb3NvZnQgQXp1cmUgRmVkZXJhdGVkIFNTTyBDZXJ0aWZpY2F0ZTAeFw0yNDExMTMxMDEwNTNaFw0yNzExMTMxMDEwNTNaMDQxMjAwBgNVBAMTKU1pY3Jvc29mdCBBenVyZSBGZWRlcmF0ZWQgU1NPIENlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwE8Ad1OMQKfaHi6YrsEcmMNwIAQ86h7JmnuABf5xLNd27jaMF4FVxHbEtC/BYxtcmwld5zbkCVXQ6PT6VoeYIjHMVnptFXg15EGgjnqpxWsjLDQNoSdSQu8VhG+8Yb5M7KPt+UEZfsRZVrgqMjdSEMVrOzPMD8KMB7wnghYX6npcZhn7D5w/F9gVDpI1Um8M/FIUKYVSYFjky1i24WvKmcBf71mAacZp48Zuj5by/ELIb6gAjpW5xpd02smpLthy/Yo4XDIQQurFOfjqyZd8xAZu/SfPsbjtymWw59tgd9RdYISl6O/241kY9h6Ojtx6WShOVDi6q+bJrfj9Z8WKcQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCiVxiQ9KpjihliQzIW45YO0EvRJtoPtyVAh9RiSGozbTl4otfrUJf8nbRtj7iZBRuuW4rrtRAH5kDb+i1wNUUQED2Pl/l4x5cN0oBytP3GSymq6NJx1gUOBO1BrNY+c3r5yHOUyj5qpbw9UkqpG1AqQkLLeZqB/yVCyOBQT7SKTbXVYhGefFM/+6z0/rGsWZN5OF6/2NC06ws1v4In28Atgpg4XxFh5TL7rPMJ11ca5MN9lHJoIUsvls053eQBcd7vJneqzd904B6WtPld6KOJK4dzIt9edHzPhaz158awWwx3iHsMn1Y/T0WVy5/4ZTzxY/i4U3t1Yt8ktxewVJYT';

	beforeAll(async () => {
		await validator.init();
	});

	describe('validateMetadata', () => {
		test('successfully validates metadata containing ws federation tags', async () => {
			// ARRANGE
			const metadata = `<?xml version="1.0" encoding="utf-8"?>
			<EntityDescriptor ID="_1069c6df-0612-4058-ae4e-1987ca45431b"
				entityID="https://sts.windows.net/random-issuer/"
				xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
				<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
					<SignedInfo>
						<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
						<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
						<Reference URI="#_1069c6df-0612-4058-ae4e-1987ca45431b">
							<Transforms>
								<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
								<Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
							</Transforms>
							<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
							<DigestValue>hoeupPMPzijHu6caNarGYjsG0eKm4DOFUhjo0bPo0Ls=</DigestValue>
						</Reference>
					</SignedInfo>
					<SignatureValue>
						DQnnT/5se4dqYN86R35MCdbyKVl64lGPLSIVrxFxrOQ9YRK1br7Z1Bt1/LQD4f92z+GwAl+9tZTWhuoy6OGHCV6LlqBEztW43KnlCKw6eaNg4/6NluzJ/XeknXYLURDnfFVyGbLQAYWGND4Qm8CUXO/GjGfWTZuArvrDDC36/2FA41jKXtf1InxGFx1Bbaskx3n3KCFFth/V9knbnc1zftEe022aQluPRoGccROOI4ZeLUFL6+1gYlxjx0gFIOTRiuvrzR765lHNrF7iZ4aD+XukqtkGEtxTkiLoB+Bnr8Fd7IF5rV5FKTZWSxo+ZFcLimrDGtFPItVrC/oKRc+MGA==</SignatureValue>
					<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
						<ds:X509Data>
							<ds:X509Certificate>${VALID_CERTIFICATE}</ds:X509Certificate>
						</ds:X509Data>
					</ds:KeyInfo>
				</Signature>
				<RoleDescriptor xsi:type="fed:SecurityTokenServiceType"
					protocolSupportEnumeration="http://docs.oasis-open.org/wsfed/federation/200706"
					xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
					xmlns:fed="http://docs.oasis-open.org/wsfed/federation/200706">
					<KeyDescriptor use="signing">
						<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
							<X509Data>
								<X509Certificate>${VALID_CERTIFICATE}</X509Certificate>
							</X509Data>
						</KeyInfo>
					</KeyDescriptor>
					<fed:ClaimTypesOffered>
						<auth:ClaimType Uri="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Name</auth:DisplayName>
							<auth:Description>The mutable display name of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Subject</auth:DisplayName>
							<auth:Description>An immutable, globally unique, non-reusable identifier of the user that is
								unique to the application for which a token is issued.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Given Name</auth:DisplayName>
							<auth:Description>First name of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Surname</auth:DisplayName>
							<auth:Description>Last name of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/displayname"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Display Name</auth:DisplayName>
							<auth:Description>Display name of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/nickname"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Nick Name</auth:DisplayName>
							<auth:Description>Nick name of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType
							Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/authenticationinstant"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Authentication Instant</auth:DisplayName>
							<auth:Description>The time (UTC) when the user is authenticated to Windows Azure Active
								Directory.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType
							Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/authenticationmethod"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Authentication Method</auth:DisplayName>
							<auth:Description>The method that Windows Azure Active Directory uses to authenticate users.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/objectidentifier"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>ObjectIdentifier</auth:DisplayName>
							<auth:Description>Primary identifier for the user in the directory. Immutable, globally
								unique, non-reusable.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/tenantid"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>TenantId</auth:DisplayName>
							<auth:Description>Identifier for the user's tenant.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/identityprovider"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>IdentityProvider</auth:DisplayName>
							<auth:Description>Identity provider for the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Email</auth:DisplayName>
							<auth:Description>Email address of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Groups</auth:DisplayName>
							<auth:Description>Groups of the user.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/accesstoken"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>External Access Token</auth:DisplayName>
							<auth:Description>Access token issued by external identity provider.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/expiration"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>External Access Token Expiration</auth:DisplayName>
							<auth:Description>UTC expiration time of access token issued by external identity provider.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/identity/claims/openid2_id"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>External OpenID 2.0 Identifier</auth:DisplayName>
							<auth:Description>OpenID 2.0 identifier issued by external identity provider.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/claims/groups.link"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>GroupsOverageClaim</auth:DisplayName>
							<auth:Description>Issued when number of user's group claims exceeds return limit.</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>Role Claim</auth:DisplayName>
							<auth:Description>Roles that the user or Service Principal is attached to</auth:Description>
						</auth:ClaimType>
						<auth:ClaimType Uri="http://schemas.microsoft.com/ws/2008/06/identity/claims/wids"
							xmlns:auth="http://docs.oasis-open.org/wsfed/authorization/200706">
							<auth:DisplayName>RoleTemplate Id Claim</auth:DisplayName>
							<auth:Description>Role template id of the Built-in Directory Roles that the user is a member
								of</auth:Description>
						</auth:ClaimType>
					</fed:ClaimTypesOffered>
					<fed:SecurityTokenServiceEndpoint>
						<wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
							<wsa:Address>https://login.microsoftonline.com/random-issuer/wsfed</wsa:Address>
						</wsa:EndpointReference>
					</fed:SecurityTokenServiceEndpoint>
					<fed:PassiveRequestorEndpoint>
						<wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
							<wsa:Address>https://login.microsoftonline.com/random-issuer/wsfed</wsa:Address>
						</wsa:EndpointReference>
					</fed:PassiveRequestorEndpoint>
				</RoleDescriptor>
				<RoleDescriptor xsi:type="fed:ApplicationServiceType"
					protocolSupportEnumeration="http://docs.oasis-open.org/wsfed/federation/200706"
					xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
					xmlns:fed="http://docs.oasis-open.org/wsfed/federation/200706">
					<KeyDescriptor use="signing">
						<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
							<X509Data>
								<X509Certificate>${VALID_CERTIFICATE}</X509Certificate>
							</X509Data>
						</KeyInfo>
					</KeyDescriptor>
					<fed:TargetScopes>
						<wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
							<wsa:Address>https://sts.windows.net/random-issuer/</wsa:Address>
						</wsa:EndpointReference>
					</fed:TargetScopes>
					<fed:ApplicationServiceEndpoint>
						<wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
							<wsa:Address>https://login.microsoftonline.com/random-issuer/wsfed</wsa:Address>
						</wsa:EndpointReference>
					</fed:ApplicationServiceEndpoint>
					<fed:PassiveRequestorEndpoint>
						<wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
							<wsa:Address>https://login.microsoftonline.com/random-issuer/wsfed</wsa:Address>
						</wsa:EndpointReference>
					</fed:PassiveRequestorEndpoint>
				</RoleDescriptor>
				<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
					<KeyDescriptor use="signing">
						<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
							<X509Data>
								<X509Certificate>${VALID_CERTIFICATE}</X509Certificate>
							</X509Data>
						</KeyInfo>
					</KeyDescriptor>
					<SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
						Location="https://login.microsoftonline.com/random-issuer/saml2" />
					<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
						Location="https://login.microsoftonline.com/random-issuer/saml2" />
					<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
						Location="https://login.microsoftonline.com/random-issuer/saml2" />
				</IDPSSODescriptor>
			</EntityDescriptor>`;

			// ACT
			const result = await validator.validateMetadata(metadata);

			// ASSERT
			expect(result).toBe(true);
		});

		test('rejects invalid metadata', async () => {
			// ARRANGE
			// Invalid because required children are missing
			const metadata = `<?xml version="1.0" encoding="utf-8"?>
			<EntityDescriptor ID="_1069c6df-0612-4058-ae4e-1987ca45431b"
				entityID="https://sts.windows.net/random-issuer/"
				xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
			</EntityDescriptor>`;

			// ACT
			const result = await validator.validateMetadata(metadata);

			// ASSERT
			expect(result).toBe(false);
		});

		test('rejects malformed XML metadata', async () => {
			// ARRANGE
			const metadata = `<?xml version="1.0" encoding="utf-8"?>
			<EntityDescriptor ID="_1069c6df-0612-4058-ae4e-1987ca45431b"
					entityID="https://sts.windows.net/random-issuer/"
					xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
					<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
							<KeyDescriptor use="signing">
									<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
											<X509Data>
													<X509Certificate>${VALID_CERTIFICATE}
													</X509Certificate>
											</X509Data>
									</KeyInfo>
							</KeyDescriptor>
					</IDPSSODescriptor>
			`; // Missing closing tags

			// ACT
			const result = await validator.validateMetadata(metadata);

			// ASSERT
			expect(result).toBe(false);
		});

		test('rejects metadata missing SingleSignOnService', async () => {
			// ARRANGE
			const metadata = `<?xml version="1.0" encoding="utf-8"?>
			<EntityDescriptor ID="_1069c6df-0612-4058-ae4e-1987ca45431b"
					entityID="https://sts.windows.net/random-issuer/"
					xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
					<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
							<KeyDescriptor use="signing">
									<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
											<X509Data>
													<X509Certificate>${VALID_CERTIFICATE}
													</X509Certificate>
											</X509Data>
									</KeyInfo>
							</KeyDescriptor>
					</IDPSSODescriptor>
			</EntityDescriptor>`;

			// ACT
			const result = await validator.validateMetadata(metadata);

			// ASSERT
			expect(result).toBe(false);
		});

		test('rejects metadata with invalid X.509 certificate', async () => {
			// ARRANGE
			const metadata = `<?xml version="1.0" encoding="utf-8"?>
			<EntityDescriptor ID="_1069c6df-0612-4058-ae4e-1987ca45431b"
					entityID="https://sts.windows.net/random-issuer/"
					xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
					<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
							<KeyDescriptor use="signing">
									<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
											<X509Data>
													<X509Certificate>
															INVALID_CERTIFICATE
													</X509Certificate>
											</X509Data>
									</KeyInfo>
							</KeyDescriptor>
							<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
									Location="https://login.microsoftonline.com/random-issuer/saml2" />
					</IDPSSODescriptor>
			</EntityDescriptor>`;

			// ACT
			const result = await validator.validateMetadata(metadata);

			// ASSERT
			expect(result).toBe(false);
		});
	});

	describe('validateResponse', () => {
		test('successfully validates response', async () => {
			// ARRANGE
			const response = `<samlp:Response ID="random_id" Version="2.0"
	IssueInstant="2024-11-13T14:58:00.371Z" Destination="random-url"
	InResponseTo="random_id"
	xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
	<Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
		https://sts.windows.net/random-issuer/</Issuer>
	<samlp:Status>
		<samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" />
	</samlp:Status>
	<Assertion ID="_random_id" IssueInstant="2024-11-13T14:58:00.367Z"
		Version="2.0" xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
		<Issuer>https://sts.windows.net/random-issuer/</Issuer>
		<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
			<SignedInfo>
				<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
				<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
				<Reference URI="#_random_id">
					<Transforms>
						<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
						<Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
					</Transforms>
					<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
					<DigestValue>random_digest</DigestValue>
				</Reference>
			</SignedInfo>
			<SignatureValue>
				cmFuZG9tX3NpZ25hdHVyZQo=</SignatureValue>
			<KeyInfo>
				<X509Data>
					<X509Certificate>
						cmFuZG9tX3NpZ25hdHVyZQo=</X509Certificate>
				</X509Data>
			</KeyInfo>
		</Signature>
		<Subject>
			<NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
				random_name_id</NameID>
			<SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
				<SubjectConfirmationData InResponseTo="random_id"
					NotOnOrAfter="2024-11-13T15:58:00.284Z"
					Recipient="random-url" />
			</SubjectConfirmation>
		</Subject>
		<Conditions NotBefore="2024-11-13T14:53:00.284Z" NotOnOrAfter="2024-11-13T15:58:00.284Z">
			<AudienceRestriction>
				<Audience>http://localhost:5678/rest/sso/saml/metadata</Audience>
			</AudienceRestriction>
		</Conditions>
		<AttributeStatement>
			<Attribute Name="http://schemas.microsoft.com/identity/claims/tenantid">
				<AttributeValue>random-issuer</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.microsoft.com/identity/claims/objectidentifier">
				<AttributeValue>4663f730-51c5-4490-a38a-19dda804865a</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.microsoft.com/identity/claims/displayname">
				<AttributeValue>Danny n8n</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.microsoft.com/identity/claims/identityprovider">
				<AttributeValue>mail</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname">
				<AttributeValue>Danny</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname">
				<AttributeValue>Martini</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
				<AttributeValue>danny@n8n.io</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name">
				<AttributeValue>random_name_id</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname/firstname">
				<AttributeValue>Danny</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname/lastname">
				<AttributeValue>Martini</AttributeValue>
			</Attribute>
			<Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn/upn">
				<AttributeValue>danny@n8n.io</AttributeValue>
			</Attribute>
		</AttributeStatement>
		<AuthnStatement AuthnInstant="2024-11-13T14:51:51.267Z"
			SessionIndex="_random_id">
			<AuthnContext>
				<AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Unspecified</AuthnContextClassRef>
			</AuthnContext>
		</AuthnStatement>
	</Assertion>
</samlp:Response>`;

			// ACT
			const result = await validator.validateResponse(response);

			// ASSERT
			expect(result).toBe(true);
		});

		test('rejects invalid response', async () => {
			// ARRANGE
			// Invalid because required children are missing
			const response = `<samlp:Response ID="random_id" Version="2.0"
	IssueInstant="2024-11-13T14:58:00.371Z" Destination="random-url"
	InResponseTo="random_id"
	xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
</samlp:Response>`;

			// ACT
			const result = await validator.validateResponse(response);

			// ASSERT
			expect(result).toBe(false);
		});

		test('rejects expired SAML response', async () => {
			// ARRANGE
			const response = `<samlp:Response ID="random_id" Version="2.0"
					IssueInstant="2024-11-13T14:58:00.371Z" Destination="random-url"
					InResponseTo="random_id"
					xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
					<Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
							https://sts.windows.net/random-issuer/</Issuer>
					<samlp:Status>
							<samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" />
					</samlp:Status>
					<Assertion ID="_random_id" IssueInstant="2024-11-13T14:58:00.367Z"
							Version="2.0" xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
							<Issuer>https://sts.windows.net/random-issuer/</Issuer>
							<Subject>
									<NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
											random_name_id</NameID>
									<SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
											<SubjectConfirmationData InResponseTo="random_id"
													NotOnOrAfter="2023-11-13T15:58:00.284Z" // Expired
													Recipient="random-url" />
									</SubjectConfirmation>
							</Subject>
							<Conditions NotBefore="2024-11-13T14:53:00.284Z" NotOnOrAfter="2023-11-13T15:58:00.284Z"> // Expired
									<AudienceRestriction>
											<Audience>http://localhost:5678/rest/sso/saml/metadata</Audience>
									</AudienceRestriction>
							</Conditions>
					</Assertion>
			</samlp:Response>`;

			// ACT
			const result = await validator.validateResponse(response);

			// ASSERT
			expect(result).toBe(false);
		});
	});
});
