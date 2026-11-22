import { expect } from 'chai';
import { PostgresDriver } from '../../src/driver/postgres/PostgresDriver';
import type { PostgresConnectionOptions } from '../../src/driver/postgres/PostgresConnectionOptions';

class FakeClient {
	queries: string[] = [];
	releaseCalls: Array<unknown> = [];
	failOn?: string;

	async query(sql: string) {
		this.queries.push(sql);
		if (this.failOn && sql.startsWith(this.failOn)) {
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

describe('PostgresDriver session settings', () => {
	it('applies session settings on every checkout by default', async () => {
		const client = new FakeClient();
		const driver = createDriver({ statementTimeout: 5000 }, [client, client]);

		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal([
			'SET search_path TO public',
			'SET statement_timeout = 5000',
			'SET search_path TO public',
			'SET statement_timeout = 5000',
		]);
	});

	it('applies session settings once per pooled client with applySessionSettingsOnce', async () => {
		const first = new FakeClient();
		const second = new FakeClient();
		const driver = createDriver({ statementTimeout: 5000, applySessionSettingsOnce: true }, [
			first,
			first,
			second,
		]);

		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();

		const expected = ['SET search_path TO public', 'SET statement_timeout = 5000'];
		expect(first.queries).to.deep.equal(expected);
		expect(second.queries).to.deep.equal(expected);
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

	it('releases the client with the error and retries when a SET fails', async () => {
		const client = new FakeClient();
		client.failOn = 'SET statement_timeout';
		const driver = createDriver({ statementTimeout: 5000, applySessionSettingsOnce: true }, [
			client,
			client,
			client,
		]);

		await expect(driver.obtainMasterConnection()).to.be.rejectedWith('query failed');
		expect(client.releaseCalls).to.have.lengthOf(1);
		expect(client.releaseCalls[0]).to.be.instanceOf(Error);

		client.failOn = undefined;
		await driver.obtainMasterConnection();
		await driver.obtainMasterConnection();

		expect(client.queries).to.deep.equal([
			'SET search_path TO public',
			'SET statement_timeout = 5000',
			'SET search_path TO public',
			'SET statement_timeout = 5000',
		]);
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
