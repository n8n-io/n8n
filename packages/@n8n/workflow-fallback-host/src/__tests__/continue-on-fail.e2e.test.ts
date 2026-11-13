/**
 * `onError: continueRegularOutput` on a plain node step: the node handles the
 * error for each item (`this.continueOnFail()`), as in v1, so the step result
 * holds the error items that the node makes.
 */
import { startTestHost, TestClient, type TestHost } from './test-client';

describe('a node step with onError continueRegularOutput', () => {
	let host: TestHost;
	let client: TestClient;

	beforeAll(async () => {
		host = await startTestHost();
		client = await TestClient.connect(host.socketPath);
	});

	afterAll(async () => {
		client.close();
		await host.stop();
	});

	const args = (extra: Record<string, unknown>) => ({
		name: 'Call',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		parameters: { url: 'http://127.0.0.1:1/x', options: {} },
		items: [{ a: 1 }],
		...extra,
	});

	it('gives the error item of the node', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'c',
				kind: 'node',
				step: 'Call',
				key: 'k-c',
				args: args({ onError: 'continueRegularOutput' }),
			},
		]);
		expect(response.ok).toBe(true);
		const result = response.ok ? response.result : [];
		expect(Array.isArray(result) && result.length).toBe(1);
		expect(JSON.stringify(result)).toContain('"error"');
	});

	it('fails the step without it', async () => {
		const [response] = await client.sendBatch([
			{ id: 'd', kind: 'node', step: 'Call', key: 'k-d', args: args({}) },
		]);
		expect(response.ok).toBe(false);
	});
});
