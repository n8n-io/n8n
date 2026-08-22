import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createAuthenticationMiddleware } from '../authenticate';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../identity-token';

const secret = 'a'.repeat(32);
const caller = { cpId: 'cp-1', tenantId: 'tenant-1' };

const app = () => {
	const application = express();
	application.use(createAuthenticationMiddleware(new SharedSecretIdentityVerifier(secret)));
	application.get('/', (req, res) => {
		res.status(200).json({ caller: req.caller });
	});
	return application;
};

describe('createAuthenticationMiddleware', () => {
	it('401s when no header is present', async () => {
		const response = await request(app()).get('/');

		expect(response.status).toBe(401);
	});

	it('401s on a non-Bearer scheme', async () => {
		const response = await request(app()).get('/').set('Authorization', 'Basic garbage');

		expect(response.status).toBe(401);
	});

	it('401s on a garbage Bearer token', async () => {
		const response = await request(app()).get('/').set('Authorization', 'Bearer garbage');

		expect(response.status).toBe(401);
	});

	it('the 401 body carries no failure reason', async () => {
		const response = await request(app()).get('/').set('Authorization', 'Bearer garbage');

		expect(response.body).toEqual({ error: 'unauthenticated' });
	});

	it('200s and populates req.caller for a valid token', async () => {
		const token = mintIdentityToken(secret, caller);

		const response = await request(app()).get('/').set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ caller });
	});
});
