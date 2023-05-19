import express from 'express';
import request from 'supertest';
import config from '@/config';
import { setupBasicAuth } from '@/middlewares/basicAuth';

describe('Basic Auth Middleware', () => {
	let app: express.Application;

	beforeAll(() => {
		app = express();
		config.set('security.basicAuth', { user: 'jim', password: 'n8n', hash: false });
		setupBasicAuth(app, config, new RegExp('^/skip-auth'));
		app.get('/test', (req, res) => res.send({ auth: true }));
		app.get('/skip-auth', (req, res) => res.send({ auth: false }));
	});

	it('should not block calls to /skip-auth', async () => {
		const response = await request(app).get('/skip-auth');
		expect(response.statusCode).toEqual(200);
		expect(response.headers).not.toHaveProperty('www-authenticate');
		expect(response.body).toEqual({ auth: false });
	});

	it('should block calls to /test if auth is absent', async () => {
		const response = await request(app).get('/test');
		expect(response.statusCode).toEqual(401);
		expect(response.headers).toHaveProperty('www-authenticate');
	});

	it('should block calls to /test if auth is invalid', async () => {
		const response = await request(app).get('/test').auth('user', 'invalid');
		expect(response.statusCode).toEqual(401);
		expect(response.headers).toHaveProperty('www-authenticate');
	});

	it('should allow access to /test if basic auth header is valid', async () => {
		const response = await request(app).get('/test').auth('jim', 'n8n');
		expect(response.statusCode).toEqual(200);
		expect(response.headers).not.toHaveProperty('www-authenticate');
		expect(response.body).toEqual({ auth: true });
	});
});
