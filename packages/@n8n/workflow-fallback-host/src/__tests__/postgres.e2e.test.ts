import { startTestHost, TestClient, type TestHost } from './test-client';

/**
 * Runs the real Postgres v2 node against a database.
 * Set WF_TEST_POSTGRES_URL, for example
 * `postgres://postgres:secret@localhost:5432/postgres`. Without it, the test is skipped.
 */
const url = process.env.WF_TEST_POSTGRES_URL;

function credentialFromUrl(value: string) {
	const parsed = new URL(value);
	return {
		host: parsed.hostname,
		port: Number(parsed.port || '5432'),
		database: parsed.pathname.slice(1) || 'postgres',
		user: decodeURIComponent(parsed.username),
		password: decodeURIComponent(parsed.password),
		ssl: 'disable',
		allowUnauthorizedCerts: false,
		maxConnections: 2,
		sshTunnel: false,
	};
}

const postgres = (id: string, query: string, items?: unknown[], options: object = {}) => ({
	id,
	kind: 'node',
	step: id,
	key: `key-${id}`,
	args: {
		name: id,
		type: 'n8n-nodes-base.postgres',
		typeVersion: 2.6,
		parameters: { operation: 'executeQuery', query, options },
		credential: 'main_db',
		...(items ? { items } : {}),
	},
});

describe.skipIf(!url)('Postgres node in the fallback host', () => {
	let host: TestHost;
	let client: TestClient;
	const table = `wf_fallback_${process.pid}`;

	beforeAll(async () => {
		host = await startTestHost();
		host.writeCredentials({ main_db: credentialFromUrl(url ?? '') });
		client = await TestClient.connect(host.socketPath);
	});

	afterAll(async () => {
		await client.sendBatch([postgres('drop', `DROP TABLE IF EXISTS ${table}`)]);
		client.close();
		await host.stop();
	});

	it('runs executeQuery with query parameters from the items', async () => {
		const [created] = await client.sendBatch([
			postgres('create', `CREATE TABLE ${table} (id int primary key, name text)`),
		]);
		expect(created.ok).toBe(true);

		const [inserted] = await client.sendBatch([
			postgres(
				'insert',
				`INSERT INTO ${table} (id, name) VALUES ($1, $2) RETURNING id, name`,
				[
					{ id: 1, name: 'Ada' },
					{ id: 2, name: 'Grace' },
				],
				{ queryReplacement: '={{ $json.id }},={{ $json.name }}' },
			),
		]);
		expect(inserted).toEqual({
			id: 'insert',
			ok: true,
			result: [
				{ id: 1, name: 'Ada' },
				{ id: 2, name: 'Grace' },
			],
		});

		const [selected] = await client.sendBatch([
			postgres('select', `SELECT count(*)::int AS n FROM ${table}`),
		]);
		expect(selected).toEqual({ id: 'select', ok: true, result: [{ n: 2 }] });
	});

	it('runs many queries at the same time', async () => {
		const requests = Array.from({ length: 10 }, (_, i) =>
			postgres(`p${i}`, `SELECT ${i}::int AS i, pg_sleep(0.05)::text AS s`),
		);
		const responses = await client.sendBatch(requests);
		expect(responses.map((r) => (r.ok ? r.result[0].i : r.error))).toEqual(
			Array.from({ length: 10 }, (_, i) => i),
		);
	});

	it('reports a SQL error', async () => {
		const [response] = await client.sendBatch([postgres('bad', 'SELECT * FROM no_such_table')]);
		expect(response.ok).toBe(false);
		expect(response.ok ? '' : response.error).toMatch(/no_such_table/);
	});
});
