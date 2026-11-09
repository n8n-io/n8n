import assert from 'node:assert';

import { setupTestServer } from './test-server';

const server = setupTestServer({ reuseServer: true });
server.app.get(['/rest/probe', '/api/v1/probe'], (req, res) => {
	res.json({ port: req.socket.localPort });
});

it.each([
	{ name: 'REST', agent: () => server.authlessAgent },
	{ name: 'public API', agent: () => server.publicApiAgentWithoutApiKey() },
])('serves repeated $name requests through the bound listener', async ({ agent }) => {
	const address = server.httpServer.address();
	assert(address !== null && typeof address !== 'string');
	for (let index = 0; index < 3; index++) {
		const response = await agent().get('/probe').expect(200);
		expect(response.body).toEqual({ port: address.port });
	}
});
