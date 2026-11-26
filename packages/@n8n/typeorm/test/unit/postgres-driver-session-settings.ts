import { expect } from 'chai';
import { PostgresDriver } from '../../src/driver/postgres/PostgresDriver';
import type { PostgresConnectionOptions } from '../../src/driver/postgres/PostgresConnectionOptions';

class FakeClient {
	queries: string[] = [];
	releaseCalls: Array<unknown> = [];
	failOn?: string;

	async query(sql: string) {
		this.queries.push(sql);
		if (this.failOn && sql.includes(this.failOn)) {
			throw new Error(`query failed: ${sql}`);
		}
		return { rows: [] };
	}

	release(err?: unknown) {
		this.releaseCalls.push(err);
	}
}

function createDriver(options: Partial<PostgresConnectionOptions>, clients: FakeClient[]) {
	// Without a DataSource the constructor returns early, so no pg package is loaded.
	const driver = new PostgresDriver();
	driver.options = { type: 'postgres', ...options } as PostgresConnectionOptions;
	let next = 0;
	driver.master = { connect: async () => clients[next++] } as unknown as PostgresDriver['master'];
	return driver;
}

/** Runs createPool against a fake pg module and returns the options it gave the pool. */
async function createPoolOptions(options: Partial<PostgresConnectionOptions>) {
	const driver = new PostgresDriver();
	driver.options = { type: 'postgres', ...options } as PostgresConnectionOptions;
	(driver as any).connection = { logger: { log() {} } };

	let poolOptions: Record<string, any> = {};
	(driver as any).postgres = {
		Pool: class {
			constructor(config: Record<string, any>) {
				poolOptions = config;
			}
			on() {}
			connect(callback: (err: unknown, client: unknown, release: () => void) => void) {
				callback(undefined, new FakeClient(), () => {});
			}
		},
	};

	await (driver as any).createPool(driver.options, driver.options);
	return poolOptions;
}

describe('PostgresDriver session settings', () => {
	it('applies session settings in one query on every checkout by default', async () => {
		const client = new FakeClient();
		const driver = createDriver({ statementTimeout: 5000 }, [client, client]);

		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal([
			'SET search_path TO public; SET statement_timeout = 5000',
			'SET search_path TO public; SET statement_timeout = 5000',
		]);
	});

	it('does not apply session settings on checkout in per-connection mode', async () => {
		const client = new FakeClient();
		const driver = createDriver({ statementTimeout: 5000, sessionSettingsMode: 'per-connection' }, [
			client,
			client,
		]);

		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal([]);
	});

	it('applies session settings in the pool onConnect hook in per-connection mode', async () => {
		const poolOptions = await createPoolOptions({
			statementTimeout: 5000,
			sessionSettingsMode: 'per-connection',
			extra: { onConnect: () => {} },
		});
		const client = new FakeClient();

		await poolOptions.onConnect(client);

		expect(client.queries).to.deep.equal([
			'SET search_path TO public; SET statement_timeout = 5000',
		]);
	});

	it('rejects from the onConnect hook when a SET fails, so the pool drops the client', async () => {
		const poolOptions = await createPoolOptions({
			statementTimeout: 5000,
			sessionSettingsMode: 'per-connection',
		});
		const client = new FakeClient();
		client.failOn = 'SET statement_timeout';

		await expect(poolOptions.onConnect(client)).to.be.rejectedWith('query failed');
	});

	it('does not register an onConnect hook in per-query mode', async () => {
		const poolOptions = await createPoolOptions({ statementTimeout: 5000 });

		expect(poolOptions.onConnect).to.equal(undefined);
	});

	it('does not set statement_timeout when it is not configured', async () => {
		const client = new FakeClient();
		const driver = createDriver({}, [client]);

		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal(['SET search_path TO public']);
	});

	it('quotes a custom schema in search_path', async () => {
		const client = new FakeClient();
		const driver = createDriver({ schema: 'my_schema' }, [client]);

		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal(['SET search_path TO "my_schema",public']);
	});

	it('releases the client with the error when a SET fails', async () => {
		const client = new FakeClient();
		client.failOn = 'SET statement_timeout';
		const driver = createDriver({ statementTimeout: 5000 }, [client]);

		await expect(driver.obtainMasterConnection()).to.be.rejectedWith('query failed');
		expect(client.releaseCalls).to.have.lengthOf(1);
		expect(client.releaseCalls[0]).to.be.instanceOf(Error);
	});

	it('returns a release function that forwards errors to the client', async () => {
		const client = new FakeClient();
		const driver = createDriver({}, [client]);

		const [connection, release] = await driver.obtainMasterConnection();
		const err = new Error('connection lost');
		release(err);

		expect(connection).to.equal(client);
		expect(client.releaseCalls).to.deep.equal([err]);
	});
});
