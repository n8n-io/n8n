import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { PostHogClient, Publisher } from '@n8n/backend-services';
import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Settings, SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createSkill, deleteAllSkills, findSkill } from '../../testing';
import { SkillSyncSettingsController } from '../../controllers/skill-sync-settings.controller';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSyncSettingsService } from '../../services/skill-sync-settings.service';
import { linkSkill } from '../test-utils/skill-source-fixtures';

import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
});

describe('Skill Sync switch', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const publisher = mockInstance(Publisher);
	const loaderConfig = Container.get(InstanceSettingsLoaderConfig);
	let ownerUser: User;
	let owner: SuperAgentTest;
	let member: SuperAgentTest;

	const moduleSettings = () => Container.get(ModuleRegistry).settings.get('skills');

	beforeAll(async () => {
		ownerUser = await createOwner();
		owner = server.authAgentFor(ownerUser);
		member = server.authAgentFor(await createMember());
	});

	beforeEach(async () => {
		await deleteAllSkills();
		await Container.get(DataSource).manager.delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		loaderConfig.skillSyncManagedByEnv = false;
		await Container.get(SkillSyncSettingsService).setEnabled(true);
		await Container.get(ModuleRegistry).refreshModuleSettings('skills');
		publisher.publishCommand.mockClear();
	});

	afterAll(() => {
		loaderConfig.skillSyncManagedByEnv = false;
		loaderConfig.skillSyncEnabled = false;
	});

	it('lets an owner turn Skill Sync off on every main', async () => {
		const response = await owner.put('/skill-sync/settings').send({ enabled: false }).expect(200);

		expect(response.body.data).toEqual({ enabled: false });
		expect(Container.get(SkillSyncSettingsService).isEnabled()).toBe(false);
		expect(moduleSettings()).toMatchObject({ skillSyncEnabled: false });
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'reload-skill-sync-settings',
		});
	});

	it('refuses a member', async () => {
		await member.put('/skill-sync/settings').send({ enabled: false }).expect(403);

		expect(Container.get(SkillSyncSettingsService).isEnabled()).toBe(true);
	});

	it('refuses a change while env manages the switch', async () => {
		loaderConfig.skillSyncManagedByEnv = true;
		loaderConfig.skillSyncEnabled = true;

		await owner.put('/skill-sync/settings').send({ enabled: false }).expect(403);

		expect(Container.get(SkillSyncSettingsService).isEnabled()).toBe(true);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
		await Container.get(ModuleRegistry).refreshModuleSettings('skills');
		expect(moduleSettings()).toEqual({ skillSyncEnabled: true, skillSyncManagedByEnv: true });
	});

	it('hides the source routes while the switch is off, and keeps the sources and synced skills', async () => {
		const skill = await createSkill();
		const sourceId = await linkSkill(skill.id, { projectId: null, createdById: ownerUser.id });
		await owner.get('/skill-sources').expect(200);

		await owner.put('/skill-sync/settings').send({ enabled: false }).expect(200);

		await owner.get('/skill-sources').expect(404);
		await owner.post('/skill-sources').send({}).expect(404);
		await owner.post(`/skill-sources/${sourceId}/check`).expect(404);
		await owner.get(`/skill-sources/${sourceId}/updates`).expect(404);
		await owner.post(`/skill-sources/${sourceId}/updates/accept`).send({}).expect(404);
		await owner.get(`/skills/${skill.id}`).expect(200);
		expect(await findSkill(skill.id)).not.toBeNull();
		expect(
			await Container.get(DataSource).manager.countBy(SkillSourceConnection, { id: sourceId }),
		).toBe(1);

		await owner.put('/skill-sync/settings').send({ enabled: true }).expect(200);

		await owner.get('/skill-sources').expect(200);
	});

	it('reloads the saved switch on a reload command', async () => {
		await Container.get(SettingsRepository).upsertByKey(
			'skills.skillSync.enabled',
			'false',
			true,
			{},
		);

		await Container.get(SkillSyncSettingsController).reloadSettings();

		expect(Container.get(SkillSyncSettingsService).isEnabled()).toBe(false);
		expect(moduleSettings()).toMatchObject({ skillSyncEnabled: false });
	});

	describe('at startup on the enterprise plan', () => {
		const settingsService = () => Container.get(SkillSyncSettingsService);
		const savedValue = async () =>
			(await Container.get(SettingsRepository).findByKey('skills.skillSync.enabled'))?.value;

		beforeEach(async () => {
			vi.spyOn(Container.get(LicenseState), 'isEnterprisePlan').mockReturnValue(true);
			await Container.get(DataSource).manager.delete(Settings, { key: 'skills.skillSync.enabled' });
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('keeps Skill Sync on and saves it when a skill source exists', async () => {
			const skill = await createSkill();
			await linkSkill(skill.id, { projectId: null, createdById: ownerUser.id });

			await settingsService().init();

			expect(settingsService().isEnabled()).toBe(true);
			expect(await savedValue()).toBe('true');
		});

		it('leaves Skill Sync off and saves nothing without a skill source', async () => {
			await settingsService().init();

			expect(settingsService().isEnabled()).toBe(false);
			expect(await savedValue()).toBeUndefined();
		});

		it('keeps a saved off value even when a skill source exists', async () => {
			const skill = await createSkill();
			await linkSkill(skill.id, { projectId: null, createdById: ownerUser.id });
			await settingsService().setEnabled(false);

			await settingsService().init();

			expect(settingsService().isEnabled()).toBe(false);
			expect(await savedValue()).toBe('false');
		});
	});
});
