import 'reflect-metadata';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Book } from './entity/Book';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';

describe('query runner > stream', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [Book],
			enabledDrivers: ['postgres'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should stream data', () =>
		Promise.all(
			connections
				.filter((connection) => {
					if (connection.driver instanceof PostgresDriver) {
						// The native driver (pg-native) does not support
						// streaming because pg-query-stream requires access to
						// the wire protocol which is not available through the
						// native libpq bindings
						if (connection.driver.isNative) {
							console.log(
								'Skipping streaming test: pg-native is incompatible with pg-query-stream',
							);
							return false;
						}
					}
					return true;
				})
				.map(async (connection) => {
					await connection.manager.save(Book, { ean: 'a' });
					await connection.manager.save(Book, { ean: 'b' });
					await connection.manager.save(Book, { ean: 'c' });
					await connection.manager.save(Book, { ean: 'd' });

					const queryRunner = connection.createQueryRunner();

					const query = connection
						.createQueryBuilder(Book, 'book')
						.select()
						.orderBy('book.ean')
						.getQuery();

					const readStream = await queryRunner.stream(query);

					const data: any[] = [];

					readStream.on('data', (row) => data.push(row));

					await new Promise((ok) => readStream.once('end', ok));

					expect(data).to.have.length(4);

					expect(data[0]).to.be.eql({ book_ean: 'a' });
					expect(data[1]).to.be.eql({ book_ean: 'b' });
					expect(data[2]).to.be.eql({ book_ean: 'c' });
					expect(data[3]).to.be.eql({ book_ean: 'd' });

					await queryRunner.release();
				}),
		));
});
