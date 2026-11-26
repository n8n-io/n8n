import type { PromotionDirection } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { storePromotionRemote } from '../git-hosts/git-host-remote';
import { PromotionSettingsService } from '../promotion-settings.service';
import { insertTokenProvider } from './utils/promotion-fixtures';

const testServer = setupTestServer({
	endpointGroups: ['promotions'],
	enabledFeatures: ['feat:promotions'],
	modules: ['promotions'],
});

const SETTINGS = {
	apply: { schemaVersion: 1, branchName: 'dev' },
	promote: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
} as const;

let owner: User;
let viewer: User;
let project: Project;

async function createEnvironment(
	direction: PromotionDirection,
	{
		name,
		scope,
		gitlab = false,
	}: { name: string; scope: 'instance' | 'projects'; gitlab?: boolean },
) {
	const provider = gitlab
		? await insertTokenProvider({
				name: `${name} provider`,
				type: 'gitlab',
				password: 'secret-token',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
			})
		: await insertTokenProvider({ name: `${name} provider`, password: 'secret-token' });
	const remoteUrl = gitlab
		? 'https://gitlab.example.com/platform/workflows.git'
		: 'https://example.com/org/workflows.git';
	return await Container.get(PromotionEnvironmentRepository).insertEnvironment({
		name,
		scope,
		providerId: provider.id,
		remote: storePromotionRemote(provider, { schemaVersion: 1, remoteUrl }),
		direction,
		settings: SETTINGS[direction],
	});
}

const setProjectEnvironments = async (enabled: boolean) =>
	await Container.get(PromotionSettingsService).setProjectEnvironmentsEnabled(owner, enabled);

const getEnvironments = async (user: User, projectId = project.id) =>
	await testServer.authAgentFor(user).get(`/projects/${projectId}/promotion-environments`);

beforeEach(async () => {
	testServer.license.reset();
	testServer.license.enable('feat:promotions');
	await Container.get(PromotionEnvironmentProjectRepository).delete({});
	await Container.get(PromotionEnvironmentRepository).delete({});
	await Container.get(PromotionProviderRepository).delete({});
	await testDb.truncate(['User']);
	owner = await createOwner();
	viewer = await createMember();
	project = await createTeamProject('Team', owner);
	await linkUserToProject(viewer, project, 'project:viewer');
	await setProjectEnvironments(true);
});

describe('GET /projects/:projectId/promotion-environments', () => {
	it('shows a project reader the name and provider type of each default environment', async () => {
		await createEnvironment('promote', { name: 'To production', scope: 'instance', gitlab: true });
		await createEnvironment('apply', { name: 'From staging', scope: 'instance' });
		const other = await createTeamProject('Other', owner);
		const own = await createEnvironment('promote', { name: 'Own', scope: 'projects' });
		await Container.get(PromotionEnvironmentProjectRepository).linkProject(
			other.id,
			own.id,
			'promote',
		);

		const response = await getEnvironments(viewer);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({
			enabled: true,
			promote: { state: 'default', name: 'To production', providerType: 'gitlab' },
			apply: { state: 'default', name: 'From staging', providerType: 'git' },
		});
	});

	it('says no environment is set up for a direction without a default environment', async () => {
		await createEnvironment('promote', { name: 'To production', scope: 'instance' });

		const response = await getEnvironments(viewer);

		expect(response.status).toBe(200);
		expect(response.body.data.apply).toEqual({ state: 'none' });
	});

	it('marks a direction as own when the project has its own environment for it', async () => {
		await createEnvironment('apply', { name: 'From staging', scope: 'instance' });
		const own = await createEnvironment('apply', { name: 'Own', scope: 'projects' });
		await Container.get(PromotionEnvironmentProjectRepository).linkProject(
			project.id,
			own.id,
			'apply',
		);

		const response = await getEnvironments(viewer);

		expect(response.status).toBe(200);
		expect(response.body.data.apply).toEqual({ state: 'own' });
	});

	it('refuses a user who cannot read the project', async () => {
		await createEnvironment('promote', { name: 'To production', scope: 'instance' });
		const outsider = await createMember();

		const response = await getEnvironments(outsider);

		expect(response.status).toBe(403);
		expect(response.body.data).toBeUndefined();
	});

	it('refuses a personal project', async () => {
		const personal = await getPersonalProject(owner);

		const response = await getEnvironments(owner, personal.id);

		expect(response.status).toBe(400);
	});

	it('refuses the request without a license for environments', async () => {
		await createEnvironment('promote', { name: 'To production', scope: 'instance' });
		testServer.license.disable('feat:promotions');

		const response = await getEnvironments(viewer);

		expect(response.status).toBe(403);
		expect(response.body.data).toBeUndefined();
	});

	it('returns no environments when project environments are off', async () => {
		await createEnvironment('promote', { name: 'To production', scope: 'instance' });
		const own = await createEnvironment('apply', { name: 'Own', scope: 'projects' });
		await Container.get(PromotionEnvironmentProjectRepository).linkProject(
			project.id,
			own.id,
			'apply',
		);
		await setProjectEnvironments(false);

		const response = await getEnvironments(viewer);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ enabled: false });
	});
});
