import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import config from '@/config';
import { DbConnection } from '@/databases/db-connection';
import { RedisClientService } from '@/services/redis-client.service';
import { mockInstance } from '@test/mocking';
import { setupTestServer } from '@test-integration/utils';

import * as testDb from './shared/test-db';

const testServer = setupTestServer({ endpointGroups: ['health'] });

const logger: Logger = mockInstance(Logger, { scoped: () => logger });

describe('HealthController', () => {
	beforeEach(async () => {
		await testDb.init();
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('should return ok when DB is connected and migrated', async () => {
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('should return error when DB is not connected', async () => {
		// ARRANGE
		await testDb.terminate();

		// ACT
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		// ASSERT
		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
		expect(logger.warn).toHaveBeenCalledWith('Not connected to the database');
	});

	it('should return error when DB is not migrated', async () => {
		// ARRANGE
		Container.get(DbConnection).connectionState.migrated = false;

		// ACT
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		// ASSERT
		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
		expect(logger.warn).toHaveBeenCalledWith('Database not migrated yet');
	});

	it('should return error when redis is not connected', async () => {
		// ARRANGE
		config.set('executions.mode', 'queue');
		jest.useFakeTimers();
		const redisClientService = Container.get(RedisClientService);
		redisClientService.emit('connection-lost', 1);
		jest.advanceTimersByTime(1100);

		// ACT
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		// ASSERT
		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
		expect(logger.warn).toHaveBeenCalledWith('Not connected to redis');
	});
});
