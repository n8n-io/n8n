import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';

import { createMember } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

/**
 * The two card endpoints: the ownership boundary, the disabled guard, and the
 * shapes the card applies at once (it does not wait for the stream).
 */

let owner: User;
let otherUser: User;
let ownerAgent: SuperAgentTest;
let project: Project;
let readOnlyProject: Project;

/** A thread owned by `owner`. `otherUser` must not reach it. */
const THREAD_ID = '8f2f0d1c-6c8a-4a25-9f6b-1b8d1f0a1111';
const RUN_ID = 'run_card_1';
const TOOL_CALL_ID = 'tc-1';

const testServer = utils.setupTestServer({
	endpointGroups: ['instance-ai'],
	modules: ['instance-ai'],
});

const preferenceRepository = () => Container.get(AiPreferenceRepository);

async function seedPreference(userId: string, content: string) {
	return await preferenceRepository().save(
		preferenceRepository().create({
			id: crypto.randomUUID(),
			content,
			// The column is NOT NULL and carries no default, so every write names a surface.
			source: 'aia',
			userId,
			projectId: null,
		}),
	);
}

beforeAll(async () => {
	owner = await createMember();
	otherUser = await createMember();
	ownerAgent = testServer.authAgentFor(owner);

	const personalProject = await getPersonalProject(owner);
	await Container.get(InstanceAiMemoryService).ensureThread(
		owner.id,
		THREAD_ID,
		personalProject.id,
		{
			source: 'assistant_page',
			origin: 'internal',
		},
	);

	project = await createTeamProject('Marketing');
	await linkUserToProject(owner, project, 'project:editor');
	readOnlyProject = await createTeamProject('Sales');
	await linkUserToProject(owner, readOnlyProject, 'project:viewer');
});

beforeEach(async () => {
	vi.restoreAllMocks();
	await testDb.truncate(['AiPreference']);
});

describe('POST /instance-ai/threads/:threadId/preferences/:preferenceId/undo', () => {
	test('refuses a thread owned by another user', async () => {
		const preference = await seedPreference(otherUser.id, 'Use British English.');

		await testServer
			.authAgentFor(otherUser)
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/undo`)
			.send({ runId: RUN_ID, toolCallId: TOOL_CALL_ID })
			.expect(403);

		// The row survives a refused call.
		expect(await preferenceRepository().findOneBy({ id: preference.id })).not.toBeNull();
	});

	test('reports a missing thread', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		await ownerAgent
			.post(
				`/instance-ai/threads/2e0a1d2b-0000-4000-8000-000000000000/preferences/${preference.id}/undo`,
			)
			.send({ runId: RUN_ID, toolCallId: TOOL_CALL_ID })
			.expect(404);
	});

	test('refuses the call while Instance AI is disabled', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');
		vi.spyOn(Container.get(InstanceAiSettingsService), 'isInstanceAiEnabled').mockReturnValue(
			false,
		);

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/undo`)
			.send({ runId: RUN_ID, toolCallId: TOOL_CALL_ID })
			.expect(403);

		expect(await preferenceRepository().findOneBy({ id: preference.id })).not.toBeNull();
	});

	// The thread is the caller's, but the row is not: `AiPreferenceService` answers as
	// if the row did not exist, the same as the settings page does.
	test('refuses a preference that belongs to another user, even from the caller thread', async () => {
		const preference = await seedPreference(otherUser.id, 'Use British English.');

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/undo`)
			.send({ runId: RUN_ID, toolCallId: TOOL_CALL_ID })
			.expect(404);

		expect(await preferenceRepository().findOneBy({ id: preference.id })).not.toBeNull();
	});

	test('deletes the row and hands back the undone fact', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		const response = await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/undo`)
			.send({ runId: RUN_ID, toolCallId: TOOL_CALL_ID })
			.expect(200);

		expect(response.body.data).toMatchObject({
			ok: true,
			event: {
				type: 'preference-card',
				runId: RUN_ID,
				payload: { toolCallId: TOOL_CALL_ID, preferenceId: preference.id, state: 'undone' },
			},
		});
		expect(await preferenceRepository().findOneBy({ id: preference.id })).toBeNull();
	});
});

describe('POST /instance-ai/threads/:threadId/preferences/:preferenceId/edit', () => {
	test('refuses a thread owned by another user', async () => {
		const preference = await seedPreference(otherUser.id, 'Use British English.');

		await testServer
			.authAgentFor(otherUser)
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: owner.id,
			})
			.expect(403);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use British English.');
	});

	test('reports a missing thread', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		await ownerAgent
			.post(
				`/instance-ai/threads/2e0a1d2b-0000-4000-8000-000000000000/preferences/${preference.id}/edit`,
			)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: owner.id,
			})
			.expect(404);
	});

	test('refuses the call while Instance AI is disabled', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');
		vi.spyOn(Container.get(InstanceAiSettingsService), 'isInstanceAiEnabled').mockReturnValue(
			false,
		);

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: owner.id,
			})
			.expect(403);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use British English.');
	});

	test('refuses a preference that belongs to another user, even from the caller thread', async () => {
		const preference = await seedPreference(otherUser.id, 'Use British English.');

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: otherUser.id,
			})
			.expect(404);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use British English.');
	});

	// The duplicate check lives in `AiPreferenceService`, so the card endpoint refuses
	// the same text the settings page refuses.
	test('refuses an edit that duplicates another preference in the same scope', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');
		await seedPreference(owner.id, 'Use American English.');

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: owner.id,
			})
			.expect(409);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use British English.');
	});

	test('updates the row and hands back the edited fact', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		const response = await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
				userId: owner.id,
			})
			.expect(200);

		expect(response.body.data).toMatchObject({
			preference: { id: preference.id, content: 'Use American English.' },
			event: {
				type: 'preference-card',
				runId: RUN_ID,
				payload: {
					toolCallId: TOOL_CALL_ID,
					preferenceId: preference.id,
					state: 'edited',
					content: 'Use American English.',
					scope: 'user',
					projectId: null,
				},
			},
		});
		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use American English.');
	});

	test('moves the row into a project the caller may write, and the fact names it', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		const response = await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use British English.',
				scope: 'project',
				projectId: project.id,
			})
			.expect(200);

		expect(response.body.data.event.payload).toMatchObject({
			state: 'edited',
			scope: 'project',
			projectId: project.id,
		});
		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row).toMatchObject({ userId: null, projectId: project.id });
	});

	test('refuses a move into a project the caller may only read', async () => {
		// Review focus 2: the chat gets the same answer the settings page gets.
		const preference = await seedPreference(owner.id, 'Use British English.');

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use British English.',
				scope: 'project',
				projectId: readOnlyProject.id,
			})
			.expect(403);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row).toMatchObject({ userId: owner.id, projectId: null });
	});

	test('refuses a move to the instance from a member', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use British English.',
				scope: 'instance',
			})
			.expect(403);

		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row).toMatchObject({ userId: owner.id, projectId: null });
	});

	test('refuses a user-scope edit that names no owner', async () => {
		const preference = await seedPreference(owner.id, 'Use British English.');

		const response = await ownerAgent
			.post(`/instance-ai/threads/${THREAD_ID}/preferences/${preference.id}/edit`)
			.send({
				runId: RUN_ID,
				toolCallId: TOOL_CALL_ID,
				content: 'Use American English.',
				scope: 'user',
			})
			.expect(400);

		expect(response.body.message).toBe('An edit of a user preference must name the user');
		const row = await preferenceRepository().findOneBy({ id: preference.id });
		expect(row?.content).toBe('Use British English.');
	});
});
