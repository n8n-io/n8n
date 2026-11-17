import express from 'express';
import request from 'supertest';

import { createWellKnownBasePathMiddleware } from '../well-known-base-path';

const createApp = (basePath: string) => {
	const app = express();
	app.use(createWellKnownBasePathMiddleware(basePath));
	app.get('/{*path}', (req, res) => {
		res.json({ url: req.url });
	});
	return app;
};

describe('createWellKnownBasePathMiddleware', () => {
	it.each([
		'/.well-known/oauth-protected-resource/n8n/mcp-server/http',
		'/.well-known/oauth-authorization-server/n8n',
		'/.well-known/oauth-authorization-server',
	])('forwards %s to the base path', async (path) => {
		const response = await request(createApp('/n8n')).get(`${path}?method=POST`);

		expect(response.body).toEqual({ url: `/n8n${path}?method=POST` });
	});

	it.each(['/.well-known/openid-configuration', '/.well-known/oauth-protected-resourcex', '/n8n'])(
		'does not change %s',
		async (path) => {
			const response = await request(createApp('/n8n')).get(path);

			expect(response.body).toEqual({ url: path });
		},
	);

	it('does not change requests when there is no base path', async () => {
		const path = '/.well-known/oauth-authorization-server';
		const response = await request(createApp('/')).get(path);

		expect(response.body).toEqual({ url: path });
	});
});
