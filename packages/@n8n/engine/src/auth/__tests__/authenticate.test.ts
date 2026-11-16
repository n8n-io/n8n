import express from 'express';
import request from 'supertest';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
	let consoleWarnMock: MockInstance;

	beforeEach(() => {
		consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnMock.mockRestore();
	});

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

	it('warns on a rejected attempt, naming the route it guarded', async () => {
		await request(app()).get('/').set('Authorization', 'Bearer garbage');

		expect(consoleWarnMock).toHaveBeenCalledWith('engine: rejected GET / - token rejected');
	});

	it('warns when no bearer token is present', async () => {
		await request(app()).get('/');

		expect(consoleWarnMock).toHaveBeenCalledWith('engine: rejected GET / - no bearer token');
	});

	it('keeps the query string out of the log', async () => {
		await request(app()).get('/?token=secret-value');

		expect(consoleWarnMock).toHaveBeenCalledWith('engine: rejected GET / - no bearer token');
	});

	it('200s and populates req.caller for a valid token', async () => {
		const token = mintIdentityToken(secret, caller);

		const response = await request(app()).get('/').set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ caller });
	});
});
