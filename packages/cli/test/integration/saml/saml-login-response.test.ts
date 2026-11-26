import { PersonRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomBytes } from 'crypto';
import type { IdentityProviderInstance } from 'samlify';

import { AUTH_COOKIE_NAME } from '@/constants';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import {
	RSA_TEST_CERTIFICATE,
	RSA_TEST_PRIVATE_KEY,
} from '@/modules/sso-saml/__tests__/saml-signing-test-fixtures';
import { setSamlLoginEnabled } from '@/modules/sso-saml/saml-helpers';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';
import {
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '@/modules/sso-saml/service-provider.ee';

import * as utils from '../shared/utils/';

const IDP_ENTITY_ID = 'https://idp.example.com/metadata';
const OTHER_SP_ENTITY_ID = 'https://other-sp.example.com/metadata';
const OTHER_SP_ACS_URL = 'https://other-sp.example.com/acs';
const POST_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';
const REDIRECT_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';

type LoginResponseFields = {
	audience: string;
	destination: string;
	recipient: string;
	email: string;
	/** Set only on the outer Response element, not in the assertion */
	outerInResponseTo?: string;
};

type Signing = { assertion: boolean; response: boolean };

const testServer = utils.setupTestServer({
	endpointGroups: ['saml'],
	enabledFeatures: ['feat:saml'],
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let samlify: typeof import('samlify');
let idp: IdentityProviderInstance;

const randomId = () => `_${randomBytes(16).toString('hex')}`;
const randomSamlEmail = () => `saml-${randomBytes(6).toString('hex')}@example.com`;

function attribute(name: string, value: string) {
	return [
		`<saml:Attribute Name="${name}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">`,
		`<saml:AttributeValue xsi:type="xs:string">${value}</saml:AttributeValue>`,
		'</saml:Attribute>',
	].join('');
}

function buildLoginResponseXml(id: string, fields: LoginResponseFields) {
	const assertionId = randomId();
	const now = new Date();
	const issueInstant = now.toISOString();
	const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
	const claims = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims';

	return [
		'<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"',
		` ID="${id}" Version="2.0" IssueInstant="${issueInstant}" Destination="${fields.destination}"`,
		fields.outerInResponseTo ? ` InResponseTo="${fields.outerInResponseTo}">` : '>',
		`<saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>`,
		'<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>',
		'<saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema"',
		` ID="${assertionId}" Version="2.0" IssueInstant="${issueInstant}">`,
		`<saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>`,
		'<saml:Subject>',
		`<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${fields.email}</saml:NameID>`,
		'<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">',
		`<saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" Recipient="${fields.recipient}"/>`,
		'</saml:SubjectConfirmation>',
		'</saml:Subject>',
		`<saml:Conditions NotBefore="${issueInstant}" NotOnOrAfter="${notOnOrAfter}">`,
		`<saml:AudienceRestriction><saml:Audience>${fields.audience}</saml:Audience></saml:AudienceRestriction>`,
		'</saml:Conditions>',
		`<saml:AuthnStatement AuthnInstant="${issueInstant}" SessionIndex="${assertionId}">`,
		'<saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext>',
		'</saml:AuthnStatement>',
		'<saml:AttributeStatement>',
		attribute(`${claims}/emailaddress`, fields.email),
		attribute(`${claims}/firstname`, 'Saml'),
		attribute(`${claims}/lastname`, 'User'),
		attribute(`${claims}/upn`, fields.email),
		'</saml:AttributeStatement>',
		'</saml:Assertion>',
		'</samlp:Response>',
	].join('');
}

/** Returns a base64 login response for this instance, signed by the test identity provider. */
async function createLoginResponse(
	overrides: Partial<LoginResponseFields> = {},
	signing: Signing = { assertion: true, response: false },
): Promise<string> {
	const fields: LoginResponseFields = {
		audience: getServiceProviderEntityId(),
		destination: getServiceProviderReturnUrl(),
		recipient: getServiceProviderReturnUrl(),
		email: randomSamlEmail(),
		...overrides,
	};
	// The identity provider reads only the signing flags from this entity
	const signingTarget = samlify.ServiceProvider({
		entityID: fields.audience,
		wantAssertionsSigned: signing.assertion,
		wantMessageSigned: signing.response,
		assertionConsumerService: [{ Binding: POST_BINDING, Location: fields.destination }],
	});
	const id = randomId();
	// No login request: the response is unsolicited, as from the identity provider dashboard
	const { context } = await idp.createLoginResponse(
		signingTarget,
		{ extract: {} },
		'post',
		{ email: fields.email },
		() => ({ id, context: buildLoginResponseXml(id, fields) }),
	);
	return context;
}

async function postLoginResponse(samlResponse: string) {
	return await testServer.authlessAgent
		.post('/sso/saml/acs')
		.type('form')
		.send({ SAMLResponse: samlResponse });
}

function hasAuthCookie(response: { headers: Record<string, unknown> }) {
	const cookies = response.headers['set-cookie'];
	return (
		Array.isArray(cookies) && cookies.some((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
	);
}

async function setIdentityProviderMetadata(metadata: string) {
	await Container.get(SamlService).setSamlPreferences({ metadata });
}

beforeAll(async () => {
	samlify = await import('samlify');
	idp = samlify.IdentityProvider({
		entityID: IDP_ENTITY_ID,
		privateKey: RSA_TEST_PRIVATE_KEY,
		signingCert: RSA_TEST_CERTIFICATE,
		singleSignOnService: [{ Binding: REDIRECT_BINDING, Location: 'https://idp.example.com/sso' }],
	});

	await Container.get(ProvisioningService).init();
	await setIdentityProviderMetadata(idp.getMetadata());
	await setSamlLoginEnabled(true);
});

describe('POST /sso/saml/acs with a signed login response', () => {
	test('accepts a response for this instance', async () => {
		const email = randomSamlEmail();

		const response = await postLoginResponse(await createLoginResponse({ email }));

		expect(response.status).toBe(302);
		expect(hasAuthCookie(response)).toBe(true);
		await expect(Container.get(PersonRepository).findByEmail(email)).resolves.not.toBeNull();
	});

	test('rejects a response for another service provider', async () => {
		const email = randomSamlEmail();
		const samlResponse = await createLoginResponse({
			email,
			audience: OTHER_SP_ENTITY_ID,
			destination: OTHER_SP_ACS_URL,
			recipient: OTHER_SP_ACS_URL,
		});

		const response = await postLoginResponse(samlResponse);

		expect(response.status).toBe(401);
		expect(hasAuthCookie(response)).toBe(false);
		await expect(Container.get(PersonRepository).findByEmail(email)).resolves.toBeNull();
	});

	test('rejects a response for a different audience', async () => {
		const response = await postLoginResponse(
			await createLoginResponse({ audience: OTHER_SP_ENTITY_ID }),
		);

		expect(response.status).toBe(401);
		expect(response.body.message).toContain('ERR_AUDIENCE_MISMATCH');
	});

	test('rejects a response with a different Destination', async () => {
		const response = await postLoginResponse(
			await createLoginResponse({ destination: OTHER_SP_ACS_URL }),
		);

		expect(response.status).toBe(401);
		expect(response.body.message).toContain('ERR_RECIPIENT_MISMATCH');
	});

	test('rejects a response with a different Recipient', async () => {
		const response = await postLoginResponse(
			await createLoginResponse({ recipient: OTHER_SP_ACS_URL }),
		);

		expect(response.status).toBe(401);
		expect(response.body.message).toContain('ERR_RECIPIENT_MISMATCH');
	});

	test('accepts each response only once', async () => {
		const samlResponse = await createLoginResponse();

		const first = await postLoginResponse(samlResponse);
		const second = await postLoginResponse(samlResponse);

		expect(first.status).toBe(302);
		expect(second.status).toBe(401);
		expect(second.body.message).toContain('ERR_REPLAYED_ASSERTION');
		expect(hasAuthCookie(second)).toBe(false);
	});

	test.each([
		{ name: 'only the assertion is signed', signing: { assertion: true, response: false } },
		{ name: 'only the response is signed', signing: { assertion: false, response: true } },
		{ name: 'both are signed', signing: { assertion: true, response: true } },
	])('accepts a response where $name', async ({ signing }) => {
		const response = await postLoginResponse(await createLoginResponse({}, signing));

		expect(response.status).toBe(302);
	});

	test('rejects an InResponseTo value that only the unsigned response element carries', async () => {
		const response = await postLoginResponse(
			await createLoginResponse({ outerInResponseTo: randomId() }),
		);

		expect(response.status).toBe(401);
		expect(response.body.message).toContain('ERR_INRESPONSETO_MISMATCH');
	});
});

describe('POST /sso/saml/acs with different identity provider metadata', () => {
	afterEach(async () => await setIdentityProviderMetadata(idp.getMetadata()));

	test('accepts a signing certificate without a use attribute', async () => {
		await setIdentityProviderMetadata(idp.getMetadata().replace(' use="signing"', ''));

		const response = await postLoginResponse(await createLoginResponse());

		expect(response.status).toBe(302);
	});

	test('rejects a response when the metadata has no signing certificate', async () => {
		await setIdentityProviderMetadata(
			idp.getMetadata().replace(' use="signing"', ' use="encryption"'),
		);

		const response = await postLoginResponse(await createLoginResponse());

		expect(response.status).toBe(401);
		expect(response.body.message).toContain('NO_SELECTED_CERTIFICATE');
	});
});
