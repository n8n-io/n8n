import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { REVIEW_TABLES, seedReviewActors } from './support/workflow-review-test-data';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

const projectsUrl = '/workflow-review-settings/projects';

let owner: User;
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

let policyService: WorkflowReviewPolicyService;
let instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig;

beforeAll(() => {
	policyService = Container.get(WorkflowReviewPolicyService);
	instanceSettingsLoaderConfig = Container.get(InstanceSettingsLoaderConfig);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	instanceSettingsLoaderConfig.securityPolicyManagedByEnv = false;
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.update({ enabled: true, alwaysRequired: false });

	({ owner, ownerProject, teamProject, ownerAgent, memberAgent } = await seedReviewActors(
		testServer.authAgentFor,
	));
});

afterAll(() => {
	instanceSettingsLoaderConfig.securityPolicyManagedByEnv = false;
});

const listInstanceSettings = (agent: SuperAgentTest, query: Record<string, string | number> = {}) =>
	agent.get(projectsUrl).query(query);

const setOption = (agent: SuperAgentTest, projectId: string, requiredByInstance: boolean) =>
	agent.patch(`${projectsUrl}/${projectId}`).send({ requiredByInstance });

const requireByProjectAdmin = async (projectId: string) =>
	await ownerAgent
		.patch(`/projects/${projectId}/workflow-review-settings`)
		.send({ requiredByProject: true })
		.expect(200);

const listedNames = async (query: Record<string, string | number>) =>
	(
		(await listInstanceSettings(ownerAgent, query).expect(200)).body.data.data as Array<{
			name: string;
		}>
	).map(({ name }) => name);

describe('listing the review option of each project', () => {
	test('lists every team project by name with its stored options and no personal space', async () => {
		const charlie = await createTeamProject('Charlie');
		const alpha = await createTeamProject('Alpha');
		await setOption(ownerAgent, alpha.id, true).expect(200);
		await requireByProjectAdmin(charlie.id);

		const response = await listInstanceSettings(ownerAgent).expect(200);

		expect(response.body.data).toEqual({
			count: 3,
			managedByEnv: false,
			data: [
				{
					id: alpha.id,
					name: 'Alpha',
					icon: null,
					requiredByInstance: true,
					requiredByProject: false,
				},
				{
					id: charlie.id,
					name: 'Charlie',
					icon: null,
					requiredByInstance: false,
					requiredByProject: true,
				},
				{
					id: teamProject.id,
					name: 'Reviews Project',
					icon: null,
					requiredByInstance: false,
					requiredByProject: false,
				},
			],
		});
	});

	test('searches by name, filters by the stored option and pages the matches with their count', async () => {
		await createTeamProject('Sales 100%');
		const salesEurope = await createTeamProject('Sales 1000');
		await createTeamProject('Marketing');
		await setOption(ownerAgent, salesEurope.id, true).expect(200);

		expect(await listedNames({ search: 'SALES' })).toEqual(['Sales 100%', 'Sales 1000']);
		expect(await listedNames({ search: '0%' })).toEqual(['Sales 100%']);
		expect(await listedNames({ search: 'sales', requiredByInstance: 'true' })).toEqual([
			'Sales 1000',
		]);

		const page = await listInstanceSettings(ownerAgent, {
			search: 'sales',
			skip: 1,
			take: 1,
		}).expect(200);
		expect(page.body.data.count).toBe(2);
		expect(page.body.data.data.map(({ name }: { name: string }) => name)).toEqual(['Sales 1000']);
	});

	test('filters by the stored option also while the instance always requires approval', async () => {
		const configured = await createTeamProject('Configured');
		const optedIn = await createTeamProject('Opted in');
		await setOption(ownerAgent, configured.id, true).expect(200);
		await requireByProjectAdmin(optedIn.id);

		// A project without a settings row and one with only the project option both count as Not required.
		expect(await listedNames({ requiredByInstance: 'false' })).toEqual([
			'Opted in',
			'Reviews Project',
		]);

		await policyService.update({ alwaysRequired: true });

		expect(await listedNames({ requiredByInstance: 'true' })).toEqual(['Configured']);
		expect(await listedNames({ requiredByInstance: 'false' })).toEqual([
			'Opted in',
			'Reviews Project',
		]);
	});
});

describe('setting the review option of a project', () => {
	test('refuses to set an option for a personal space or an unknown project', async () => {
		await setOption(ownerAgent, ownerProject.id, true).expect(404);
		await setOption(ownerAgent, uuid(), true).expect(404);
	});

	test('records one audit event for each change with the project, the user and the new option', async () => {
		const eventService = Container.get(EventService);
		const events: unknown[] = [];
		const listener = (event: unknown) => events.push(event);
		eventService.on('project-workflow-review-required-by-instance-updated', listener);

		try {
			await setOption(ownerAgent, teamProject.id, true).expect(200);
			await setOption(ownerAgent, teamProject.id, false).expect(200);
			await Promise.all([
				setOption(ownerAgent, teamProject.id, true).expect(200),
				setOption(ownerAgent, teamProject.id, true).expect(200),
			]);
		} finally {
			eventService.off('project-workflow-review-required-by-instance-updated', listener);
		}

		expect(events).toEqual(
			[true, false, true].map((requiredByInstance) => ({
				user: expect.objectContaining({ id: owner.id }),
				projectId: teamProject.id,
				requiredByInstance,
			})),
		);
	});

	test('records nothing when the same option is saved again', async () => {
		await setOption(ownerAgent, teamProject.id, true).expect(200);
		const eventService = Container.get(EventService);
		const listener = vi.fn();
		eventService.on('project-workflow-review-required-by-instance-updated', listener);

		try {
			const response = await setOption(ownerAgent, teamProject.id, true).expect(200);
			expect(response.body.data).toEqual({ requiredByInstance: true });
		} finally {
			eventService.off('project-workflow-review-required-by-instance-updated', listener);
		}

		expect(listener).not.toHaveBeenCalled();
	});
});

describe('access to the review option of each project', () => {
	const storedOption = async () =>
		(await listInstanceSettings(ownerAgent).expect(200)).body.data.data.find(
			({ id }: { id: string }) => id === teamProject.id,
		).requiredByInstance;

	test('rejects a member and a project admin who read or change options', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');

		for (const agent of [memberAgent, testServer.authAgentFor(projectAdmin)]) {
			await listInstanceSettings(agent).expect(403);
			await setOption(agent, teamProject.id, true).expect(403);
		}

		expect(await storedOption()).toBe(false);
	});

	test('rejects reads and changes without the workflow reviews license', async () => {
		testServer.license.disable('feat:workflowReviews');

		await listInstanceSettings(ownerAgent).expect(403);
		await setOption(ownerAgent, teamProject.id, true).expect(403);
	});

	test('refuses to list or change options while reviews are off and keeps the stored options', async () => {
		await setOption(ownerAgent, teamProject.id, true).expect(200);
		await policyService.update({ enabled: false });

		await listInstanceSettings(ownerAgent).expect(403);
		await setOption(ownerAgent, teamProject.id, false).expect(403);

		await policyService.update({ enabled: true });
		expect(await storedOption()).toBe(true);
	});

	test('rejects changes while the security policy is managed by environment variables and reports it on read', async () => {
		instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;

		await setOption(ownerAgent, teamProject.id, true).expect(403);

		const response = await listInstanceSettings(ownerAgent).expect(200);
		expect(response.body.data.managedByEnv).toBe(true);
		expect(await storedOption()).toBe(false);
	});
});
