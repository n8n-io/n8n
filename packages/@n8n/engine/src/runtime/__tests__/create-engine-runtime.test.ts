import type { DataSource } from '@n8n/typeorm';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import type { EngineStores } from '../../database';
import { createEngineRuntime } from '../create-engine-runtime';

/** Enough of a `DataSource` for the stores: they only hold on to a repository. */
const fakeDataSource = () => ({ getRepository: vi.fn(() => ({})) }) as unknown as DataSource;

const runtime = () =>
	createEngineRuntime({
		dataSource: fakeDataSource(),
		admittance: new AllowAllAdmittance(),
	});

describe('createEngineRuntime', () => {
	it('mounts the execution API', async () => {
		// a rejected body proves the route is mounted without reaching the store
		const response = await request(runtime().app).post('/api/workflow-executions').send({});

		expect(response.status).toBe(400);
	});

	it('serves the healthcheck', async () => {
		const response = await request(runtime().app).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('hands the engine stores to the external dependencies', () => {
		let stores: EngineStores | undefined;

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			externalDependencies: (given) => {
				stores = given;
				return {};
			},
		});

		expect(stores?.executionStore).toBeDefined();
		expect(stores?.stepStore).toBeDefined();
	});

	it('starts and stops both workers', async () => {
		const engine = runtime();
		engine.start();

		await expect(engine.stop()).resolves.toBeUndefined();
	});
});
