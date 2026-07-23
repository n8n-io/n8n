import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialUserEntryRepository } from '@/modules/dynamic-credentials.ee/database/repositories/dynamic-credential-user-entry.repository';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { Telemetry } from '@/telemetry';

import { saveCredential } from '../shared/db/credentials';
import { createMember } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(Telemetry);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: 'static-test-token',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

const testServer = setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing', 'feat:dynamicCredentials'],
	modules: ['dynamic-credentials'],
});

let memberA: User;
let memberB: User;
let teamProject: Project;
let storage: DynamicCredentialUserEntryStorage;
let userEntryRepository: DynamicCredentialUserEntryRepository;

beforeEach(async () => {
	await testDb.truncate([
		'DynamicCredentialUserEntry',
		'DynamicCredentialResolver',
		'SharedCredentials',
		'CredentialsEntity',
	]);

	memberA = await createMember();
	memberB = await createMember();

	teamProject = await createTeamProject(undefined, memberA);
	await linkUserToProject(memberB, teamProject, 'project:editor');

	storage = Container.get(DynamicCredentialUserEntryStorage);
	userEntryRepository = Container.get(DynamicCredentialUserEntryRepository);

	const resolverRepository = Container.get(DynamicCredentialResolverRepository);
	await resolverRepository.save(
		resolverRepository.create({
			id: SYSTEM_RESOLVER_ID,
			name: SYSTEM_RESOLVER_NAME,
			type: SYSTEM_RESOLVER_TYPE,
			config: '{}',
		}),
	);
});

const seedUserEntry = async (credentialId: string, userId: string) => {
	await storage.setCredentialData(
		credentialId,
		userId,
		SYSTEM_RESOLVER_ID,
		'encrypted-payload',
		{},
	);
};

const saveResolvableCredential = async () =>
	await saveCredential(randomCredentialPayload({ isResolvable: true }), {
		project: teamProject,
		role: 'credential:owner',
	});

describe('DELETE /credentials/:credentialId/my-connection', () => {
	test("deletes the running user's entry and returns 204", async () => {
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, memberA.id);

		await testServer
			.authAgentFor(memberA)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(204);

		const remaining = await userEntryRepository.find({
			where: { credentialId: credential.id, userId: memberA.id },
		});
		expect(remaining).toHaveLength(0);
	});

	test("does not affect other users' entries on the same credential", async () => {
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, memberA.id);
		await seedUserEntry(credential.id, memberB.id);

		await testServer
			.authAgentFor(memberA)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(204);

		const memberBEntries = await userEntryRepository.find({
			where: { credentialId: credential.id, userId: memberB.id },
		});
		expect(memberBEntries).toHaveLength(1);
	});

	test('returns 404 when no entry exists for the running user', async () => {
		const credential = await saveResolvableCredential();

		await testServer
			.authAgentFor(memberA)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(404);
	});

	test('returns 404 on repeat call (entry already deleted)', async () => {
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, memberA.id);

		await testServer
			.authAgentFor(memberA)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(204);

		await testServer
			.authAgentFor(memberA)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(404);
	});

	test('lets a user without project access clear their own entry', async () => {
		// User had access in the past, connected, then lost project access.
		// They must still be able to clear their own stored tokens.
		const outsider = await createMember();
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, outsider.id);

		await testServer
			.authAgentFor(outsider)
			.delete(`/credentials/${credential.id}/my-connection`)
			.expect(204);

		const remaining = await userEntryRepository.find({
			where: { credentialId: credential.id, userId: outsider.id },
		});
		expect(remaining).toHaveLength(0);
	});

	test('rejects unauthenticated requests', async () => {
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, memberA.id);

		const response = await testServer.authlessAgent.delete(
			`/credentials/${credential.id}/my-connection`,
		);
		expect([401, 403]).toContain(response.status);
	});

	test('emits credentials-user-disconnected audit event on success', async () => {
		const credential = await saveResolvableCredential();
		await seedUserEntry(credential.id, memberA.id);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

		try {
			await testServer
				.authAgentFor(memberA)
				.delete(`/credentials/${credential.id}/my-connection`)
				.expect(204);

			expect(emitSpy).toHaveBeenCalledWith(
				'credentials-user-disconnected',
				expect.objectContaining({
					credentialId: credential.id,
					credentialType: credential.type,
					user: expect.objectContaining({ id: memberA.id }),
				}),
			);
		} finally {
			emitSpy.mockRestore();
		}
	});

	test('does not emit the event when nothing was deleted', async () => {
		const credential = await saveResolvableCredential();

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

		try {
			await testServer
				.authAgentFor(memberA)
				.delete(`/credentials/${credential.id}/my-connection`)
				.expect(404);

			expect(emitSpy).not.toHaveBeenCalledWith('credentials-user-disconnected', expect.anything());
		} finally {
			emitSpy.mockRestore();
		}
	});
});
