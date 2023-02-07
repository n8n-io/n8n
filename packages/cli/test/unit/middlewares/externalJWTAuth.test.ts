import express from 'express';
import request from 'supertest';
import createJWKSMock from 'mock-jwks';
import config from '@/config';
import { setupExternalJWTAuth } from '@/middlewares/externalJWTAuth';

const testJWKUri = 'https://n8n.test/';
const jwksMock = createJWKSMock(testJWKUri);

describe('External JWT Auth Middleware', () => {
	let app: express.Application;

	beforeAll(() => {
		app = express();
		config.set('security.jwtAuth.jwtHeader', 'Authorization');
		config.set('security.jwtAuth.jwtHeaderValuePrefix', 'Bearer');
		config.set('security.jwtAuth.jwtIssuer', 'n8n');
		config.set('security.jwtAuth.jwksUri', `${testJWKUri}.well-known/jwks.json`);
		setupExternalJWTAuth(app, config, new RegExp('^/skip-auth'));
		app.get('/test', (req, res) => res.send({ auth: true }));
		app.get('/skip-auth', (req, res) => res.send({ auth: false }));

		jwksMock.start();
	});

	it('should not block calls to /skip-auth', async () => {
		const response = await request(app).get('/skip-auth');
		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({ auth: false });
	});

	it('should block calls to /test if auth is absent', async () =>
		request(app).get('/test').expect(403));

	it('should block calls to /test if auth is invalid', async () => {
		const token = jwksMock.token({ iss: 'invalid' });
		const response = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
		expect(response.statusCode).toEqual(403);
	});

	it('should allow access to /test if JWT auth header is valid', async () => {
		const token = jwksMock.token({ iss: 'n8n' });
		const response = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({ auth: true });
	});
});
