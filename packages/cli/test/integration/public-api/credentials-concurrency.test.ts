import { GlobalConfig } from '@n8n/config';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { createOwnerWithApiKey } from '../shared/db/users';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

// Two connections let both requests reach the insert before either commits.
Container.get(GlobalConfig).database.postgresdb.poolSize = 2;
const server = setupTestServer({ endpointGroups: ['publicApi'] });

describe.skipIf(process.env.DB_TYPE !== 'postgresdb')('Concurrent credential creation', () => {
	it('commits one request and returns one conflict for the same ID', async () => {
		await initCredentialsTypes();
		const owner = await createOwnerWithApiKey();
		const repository = Container.get(CredentialsRepository);
		const insert = repository.insertProjectCredentialWithOwner.bind(repository);
		let arrivals = 0;
		let release: () => void = () => {};
		const barrier = new Promise<void>((resolve) => {
			release = resolve;
		});
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			release();
		}, 10_000);
		const spy = vi
			.spyOn(repository, 'insertProjectCredentialWithOwner')
			.mockImplementation(async (...args) => {
				if (++arrivals === 2) release();
				await barrier;
				return await insert(...args);
			});
		try {
			const payload = { id: 'concurrent-cred', name: 'Concurrent credential', type: 'githubApi' };
			const responses = await Promise.all(
				['first', 'second'].map(
					async (accessToken) =>
						await server
							.publicApiAgentFor(owner)
							.post('/credentials')
							.send({ ...payload, data: { accessToken, user: 'test', server: 'testServer' } }),
				),
			);
			expect(arrivals).toBe(2);
			expect(timedOut).toBe(false);
			expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
			expect(await repository.countBy({ id: payload.id })).toBe(1);
			const stored = await repository.findOneByOrFail({ id: payload.id });
			expect(await Container.get(CredentialsService).decrypt(stored, true)).toMatchObject({
				accessToken: responses[0].statusCode === 200 ? 'first' : 'second',
			});
			expect(
				await Container.get(SharedCredentialsRepository).countBy({ credentialsId: payload.id }),
			).toBe(1);
		} finally {
			clearTimeout(timeout);
			spy.mockRestore();
		}
	});
});
