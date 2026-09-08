import type { DataSource } from '@n8n/typeorm';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import type { EngineStores } from '../../database';
import { BatchingLifecycleEventPublisher } from '../../lifecycle-events';
import { createEngineRuntime } from '../create-engine-runtime';

/** Enough of a `DataSource` for the stores: they only hold on to a repository. */
const fakeDataSource = () => ({ getRepository: vi.fn(() => ({})) }) as unknown as DataSource;

const secret = 'a'.repeat(32);
const identityVerifier = new SharedSecretIdentityVerifier(secret);
const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });

const runtime = () =>
	createEngineRuntime({
		dataSource: fakeDataSource(),
		admittance: new AllowAllAdmittance(),
		identityVerifier,
	});

describe('createEngineRuntime', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('mounts the execution API behind authentication', async () => {
		const unauthenticated = await request(runtime().app).post('/api/workflow-executions').send({});
		expect(unauthenticated.status).toBe(401);

		// a rejected body proves the route is mounted without reaching the store
		const response = await request(runtime().app)
			.post('/api/workflow-executions')
			.set('Authorization', `Bearer ${token}`)
			.send({});

		expect(response.status).toBe(400);
	});

	it('does not parse an unauthenticated request body', async () => {
		const response = await request(runtime().app)
			.post('/api/workflow-executions')
			.set('Content-Type', 'application/json')
			.send('{');

		expect(response.status).toBe(401);
		expect(response.body).toEqual({ error: 'unauthenticated' });
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
			identityVerifier,
			externalDependencies: (given) => {
				stores = given;
				return {};
			},
		});

		expect(stores?.executionStore).toBeDefined();
		expect(stores?.stepStore).toBeDefined();
	});

	it('builds the external dependencies exactly once', () => {
		// Three handlers share the result, so building twice would split them.
		const build = vi.fn().mockReturnValue({});

		createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			externalDependencies: build,
		});

		expect(build).toHaveBeenCalledOnce();
	});

	it('stops the batching publisher it builds for a host lifecycle event callback', async () => {
		// Only the wiring is this test's business: a host callback gets a batching
		// publisher, and stopping the engine stops it.
		const flushOnStop = vi.spyOn(BatchingLifecycleEventPublisher.prototype, 'stop');
		const engine = createEngineRuntime({
			dataSource: fakeDataSource(),
			admittance: new AllowAllAdmittance(),
			identityVerifier,
			externalDependencies: () => ({
				lifecycleEventCallback: vi.fn().mockResolvedValue(undefined),
			}),
		});
		engine.start();

		await expect(engine.stop()).resolves.toBeUndefined();
		expect(flushOnStop).toHaveBeenCalledOnce();
	});

	it('starts and stops both workers', async () => {
		const engine = runtime();
		engine.start();

		await expect(engine.stop()).resolves.toBeUndefined();
	});
});
