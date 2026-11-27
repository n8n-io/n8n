import { GlobalConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';

import { MfaService } from '@/mfa/mfa.service';

import { createUser } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const server = setupTestServer({ endpointGroups: ['publicApi'] });
const post = (email: string, fields: Record<string, unknown> = {}) =>
	server
		.publicApiAgentWithoutApiKey()
		.post('/auth/api-key')
		.send({
			email,
			password: 'password',
			label: 'deployment',
			scopes: ['workflow:list'],
			expiresInDays: 1,
			...fields,
		});

beforeEach(() => {
	Container.get(GlobalConfig).publicApi.ownerKeyExchangeEnabled = true;
});
afterEach(() => {
	Container.get(GlobalConfig).publicApi.ownerKeyExchangeEnabled = false;
	Container.get(GlobalConfig).publicApi.disabled = false;
	vi.restoreAllMocks();
});

test('requires both the exchange and the public API', async () => {
	const config = Container.get(GlobalConfig).publicApi;
	config.ownerKeyExchangeEnabled = false;
	await post('owner@example.com').expect(404);
	config.ownerKeyExchangeEnabled = true;
	config.disabled = true;
	await post('owner@example.com').expect(404);
});

test('issues an expiring scoped key once per label without a session', async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	const before = Math.floor(Date.now() / 1000);
	const result = await post(owner.email).expect(201);
	expect(result.body.expiresAt).toBeGreaterThanOrEqual(before + 86400);
	expect(result.body.expiresAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 86400);
	expect(result.headers['set-cookie']).toBeUndefined();
	expect(result.headers['cache-control']).toBe('no-store');
	const api = server.publicApiAgentWithoutApiKey();
	await api.get('/workflows').set('X-N8N-API-KEY', result.body.apiKey).expect(200);
	await api.get('/tags').set('X-N8N-API-KEY', result.body.apiKey).expect(403);
	await post(owner.email).expect(409);
});

test('rejects invalid grants and incorrect credentials', async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	await post(owner.email, { scopes: ['unknown:scope'] }).expect(400);
	await post(owner.email, { expiresInDays: 91 }).expect(400);
	await post(owner.email, { password: 'incorrect' }).expect(401);
	await post((await createUser()).email).expect(401);
	await post((await createUser({ role: GLOBAL_OWNER_ROLE, disabled: true })).email).expect(401);
});

test('requires owner MFA and refuses issuance before mandatory enrollment', async () => {
	const enrolled = await createUser({ role: GLOBAL_OWNER_ROLE, mfaEnabled: true });
	await post(enrolled.email).expect(401);
	const mfa = Container.get(MfaService);
	const secret = mfa.totp.generateSecret();
	await mfa.saveSecretAndRecoveryCodes(enrolled.id, secret, []);
	await post(enrolled.email, { mfaCode: mfa.totp.generateTOTP(secret) }).expect(201);
	vi.spyOn(mfa, 'isMFAEnforced').mockResolvedValue(true);
	await post((await createUser({ role: GLOBAL_OWNER_ROLE })).email).expect(401);
});

test('limits attempts across email casing', async () => {
	const email = 'limits@example.com';
	for (let i = 0; i < 5; i++) await post(email).expect(401);
	await post(email.toUpperCase()).expect(429);
});

test('rejects a body that is not JSON', async () => {
	await server
		.publicApiAgentWithoutApiKey()
		.post('/auth/api-key')
		.type('text/plain')
		.send('email=owner@example.com')
		.expect(415)
		.expect('Cache-Control', 'no-store');
});

test('rejects malformed and oversized JSON without echoing credentials', async () => {
	const api = server.publicApiAgentWithoutApiKey();
	for (const [body, status] of [
		['{"password":"example"', 400],
		[JSON.stringify({ password: 'x'.repeat(16384) }), 413],
	] as const) {
		await api
			.post('/AUTH/API-KEY/')
			.type('json')
			.send(body)
			.expect(status)
			.expect('Cache-Control', 'no-store')
			.expect({ message: 'Invalid key exchange request' });
	}
});
