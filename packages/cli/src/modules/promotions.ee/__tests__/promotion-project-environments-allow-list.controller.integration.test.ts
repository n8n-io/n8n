import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';
import { onTestFinished } from 'vitest';

import { ProjectService } from '@/services/project.service.ee';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

import { PromotionProjectSettings } from '../database/entities/promotion-project-settings.entity';
import { PromotionSettingsService } from '../promotion-settings.service';

const testServer = setupTestServer({
	endpointGroups: ['promotions'],
	modules: ['promotions', 'n8n-packages'],
	enabledFeatures: ['feat:promotions'],
});

const projectsUrl = '/promotions/settings/project-environments/projects';
const eventName = 'promotion-project-environments-allow-list-updated';

let owner: User;
let member: User;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let alpha: Project;
let bravo: Project;
let charlie: Project;

const setProjectEnvironmentsEnabled = async (enabled: boolean) =>
	await Container.get(PromotionSettingsService).setProjectEnvironmentsEnabled(owner, enabled);

const list = (agent: SuperAgentTest, query: Record<string, string | number> = {}) =>
	agent.get(projectsUrl).query(query);

const setAllowed = (agent: SuperAgentTest, projectId: string, allowEnvironments: boolean) =>
	agent.patch(`${projectsUrl}/${projectId}`).send({ allowEnvironments });

const listedNames = async (query: Record<string, string | number>) =>
	((await list(ownerAgent, query).expect(200)).body.data.data as Array<{ name: string }>).map(
		({ name }) => name,
	);

const storedValue = async (projectId: string) =>
	(
		(await list(ownerAgent, { take: 50 }).expect(200)).body.data.data as Array<{
			id: string;
			allowEnvironments: boolean;
		}>
	).find(({ id }) => id === projectId)?.allowEnvironments;

const storedRowCount = async (projectId: string) =>
	await Container.get(DataSource).getRepository(PromotionProjectSettings).countBy({ projectId });

const recordEvents = () => {
	const events: unknown[] = [];
	const listener = (event: unknown) => events.push(event);
	const eventService = Container.get(EventService);
	eventService.on(eventName, listener);
	onTestFinished(() => {
		eventService.off(eventName, listener);
	});
	return events;
};

beforeEach(async () => {
	testServer.license.enable('feat:promotions');
	await testDb.truncate(['ProjectRelation', 'Project', 'User']);

	owner = await createOwner();
	member = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(member);

	charlie = await createTeamProject('Charlie');
	alpha = await createTeamProject('Alpha');
	bravo = await createTeamProject('Bravo');

	await setProjectEnvironmentsEnabled(true);
});

describe('listing which projects can have own environments', () => {
	test('lists every team project by name with its stored value and no personal project', async () => {
		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		await setAllowed(ownerAgent, bravo.id, true).expect(200);
		await setAllowed(ownerAgent, bravo.id, false).expect(200);

		const response = await list(ownerAgent).expect(200);

		expect(response.body.data).toEqual({
			count: 3,
			data: [
				{ id: alpha.id, name: 'Alpha', allowEnvironments: true },
				{ id: bravo.id, name: 'Bravo', allowEnvironments: false },
				{ id: charlie.id, name: 'Charlie', allowEnvironments: false },
			],
		});
	});

	test('searches by name in any letter case, filters by the stored value and pages the matches with their count', async () => {
		const salesPercent = await createTeamProject('Sales A 100%');
		const salesThousand = await createTeamProject('Sales B 1000');
		await createTeamProject('Sales C 1_00');
		await setAllowed(ownerAgent, salesThousand.id, true).expect(200);
		await setAllowed(ownerAgent, salesPercent.id, true).expect(200);
		await setAllowed(ownerAgent, salesPercent.id, false).expect(200);

		expect(await listedNames({ search: 'sALES' })).toEqual([
			'Sales A 100%',
			'Sales B 1000',
			'Sales C 1_00',
		]);
		expect(await listedNames({ search: '0%' })).toEqual(['Sales A 100%']);
		expect(await listedNames({ search: '1_' })).toEqual(['Sales C 1_00']);
		expect((await list(ownerAgent, { search: 'zzz' }).expect(200)).body.data).toEqual({
			count: 0,
			data: [],
		});
		expect(await listedNames({ allowEnvironments: 'true' })).toEqual(['Sales B 1000']);
		expect(await listedNames({ allowEnvironments: 'false' })).toEqual([
			'Alpha',
			'Bravo',
			'Charlie',
			'Sales A 100%',
			'Sales C 1_00',
		]);

		const page = await list(ownerAgent, {
			search: 'sales',
			allowEnvironments: 'false',
			skip: 1,
			take: 1,
		}).expect(200);
		expect(page.body.data.count).toBe(2);
		expect(page.body.data.data.map(({ name }: { name: string }) => name)).toEqual(['Sales C 1_00']);
	});
});

describe('setting whether a project can have own environments', () => {
	test('refuses to list or change values while project environments are off and keeps the stored values', async () => {
		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		await setProjectEnvironmentsEnabled(false);

		await list(ownerAgent).expect(403);
		await setAllowed(ownerAgent, alpha.id, false).expect(403);

		await setProjectEnvironmentsEnabled(true);
		expect(await storedValue(alpha.id)).toBe(true);
	});

	test('refuses an unknown project and a personal project and stores nothing', async () => {
		const events = recordEvents();
		const personalProject = await getPersonalProject(owner);

		await setAllowed(ownerAgent, personalProject.id, true).expect(404);
		await setAllowed(ownerAgent, uuid(), true).expect(404);

		expect(await storedRowCount(personalProject.id)).toBe(0);
		expect(events).toEqual([]);
	});

	test('sends one event for each change with the user and the project', async () => {
		const events = recordEvents();

		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		await setAllowed(ownerAgent, alpha.id, false).expect(200);
		await Promise.all([
			setAllowed(ownerAgent, alpha.id, true).expect(200),
			setAllowed(ownerAgent, alpha.id, true).expect(200),
		]);

		expect(events).toEqual(
			[true, false, true].map((allowEnvironments) => ({
				user: expect.objectContaining({ id: owner.id }),
				projectId: alpha.id,
				allowEnvironments,
				loginId: undefined,
			})),
		);
	});

	test('sends no event when a save does not change the value', async () => {
		const events = recordEvents();

		const response = await setAllowed(ownerAgent, alpha.id, false).expect(200);
		expect(response.body.data).toEqual({ allowEnvironments: false });
		expect(events).toEqual([]);

		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		expect(events).toHaveLength(1);
	});

	test('removes the stored value when the project is deleted', async () => {
		await setAllowed(ownerAgent, alpha.id, true).expect(200);
		expect(await storedRowCount(alpha.id)).toBe(1);

		await Container.get(ProjectService).deleteProject(owner, alpha.id);

		expect(await storedRowCount(alpha.id)).toBe(0);
	});
});

describe('access to the project environments allow list', () => {
	test('rejects a member and a project admin who list or change values', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, alpha, 'project:admin');

		for (const agent of [memberAgent, testServer.authAgentFor(projectAdmin)]) {
			await list(agent).expect(403);
			await setAllowed(agent, alpha.id, true).expect(403);
		}

		expect(await storedValue(alpha.id)).toBe(false);
	});

	test('rejects the list and a change without the promotions license', async () => {
		testServer.license.disable('feat:promotions');

		await list(ownerAgent).expect(403);
		await setAllowed(ownerAgent, alpha.id, true).expect(403);
	});
});
