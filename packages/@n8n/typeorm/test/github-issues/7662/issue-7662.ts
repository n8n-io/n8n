import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { MemoryLogger } from './memory-logger';

describe('github issues > #7662 postgres extensions installation should be optional', function () {
	it('should NOT install extensions if option is disabled', async function () {
		let connection: DataSource | null = null;
		try {
			const connections = await createTestingConnections({
				entities: [`${__dirname}/entity/*{.js,.ts}`],
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				createLogger: () => new MemoryLogger(true),
				driverSpecific: {
					installExtensions: false,
				},
			});

			if (connections.length < 1) {
				this.skip();
				return;
			}

			connection = connections[0];

			const logger = connection.logger as MemoryLogger;
			const createExtensionQueries = logger.queries.filter((q) =>
				q.startsWith('CREATE EXTENSION IF NOT EXISTS'),
			);

			expect(createExtensionQueries).to.be.empty;
		} finally {
			if (connection) {
				const logger = connection.logger as MemoryLogger;
				logger.clear();
				await closeTestingConnections([connection]);
			}
		}
	});

	it('should install extensions if option is undefined', async function () {
		let connections: DataSource[] = [];
		try {
			connections = await createTestingConnections({
				entities: [`${__dirname}/entity/*{.js,.ts}`],
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				createLogger: () => new MemoryLogger(true),
			});

			if (connections.length < 1) {
				this.skip();
				return;
			}

			const connection = connections[0];

			const logger = connection.logger as MemoryLogger;
			const createExtensionQueries = logger.queries.filter((q) =>
				q.startsWith('CREATE EXTENSION IF NOT EXISTS'),
			);

			expect(createExtensionQueries).to.have.length(1);
		} finally {
			await closeTestingConnections(connections);
		}
	});

	it('should install extensions if option is enabled', async function () {
		let connections: DataSource[] = [];
		try {
			connections = await createTestingConnections({
				entities: [`${__dirname}/entity/*{.js,.ts}`],
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				createLogger: () => new MemoryLogger(true),
				driverSpecific: {
					installExtensions: true,
				},
			});

			if (connections.length < 1) {
				this.skip();
			}

			const connection = connections[0];

			const logger = connection.logger as MemoryLogger;
			const createExtensionQueries = logger.queries.filter((q) =>
				q.startsWith('CREATE EXTENSION IF NOT EXISTS'),
			);

			expect(createExtensionQueries).to.have.length(1);
		} finally {
			await closeTestingConnections(connections);
		}
	});
});
