import { ModuleRegistry } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { Person } from '@n8n/db';
import { AiPreferenceRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { License } from '@/license';
import {
	AI_PREFERENCES_ENABLED_KEY,
	AiPreferenceSettingsService,
} from '@/services/ai-preference-settings.service';

import { createAdmin, createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let owner: Person;
let admin: Person;
let member: Person;

let ownerAgent: SuperAgentTest;
let adminAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['ai-preferences'] });

const settings = () => Container.get(ModuleRegistry).settings;
const preferenceSettings = () => Container.get(AiPreferenceSettingsService);
const loaderConfig = () => Container.get(InstanceSettingsLoaderConfig);

const setConsumers = ({ assistant = false, mcp = false }) => {
	settings().set('instance-ai', { enabled: assistant });
	settings().set('mcp', { mcpAccessEnabled: mcp });
};

async function savedValue() {
	const row = await Container.get(SettingsRepository).findByKey(AI_PREFERENCES_ENABLED_KEY);
	return row?.value;
}

async function seedPreference(userId: string) {
	const repository = Container.get(AiPreferenceRepository);
	return await repository.save(
		repository.create({
			id: crypto.randomUUID(),
			content: 'Keep replies short.',
			source: 'ui',
			userId,
			projectId: null,
		}),
	);
}

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();

	ownerAgent = testServer.authAgentFor(owner);
	adminAgent = testServer.authAgentFor(admin);
	memberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	vi.restoreAllMocks();
	setConsumers({ mcp: true });
	loaderConfig().preferencesManagedByEnv = false;
	await testDb.truncate(['AiPreference']);
	await Container.get(SettingsRepository).delete({ key: AI_PREFERENCES_ENABLED_KEY });
	await preferenceSettings().reload();
});

afterAll(() => {
	settings().delete('instance-ai');
	settings().delete('mcp');
});

describe('/ai-preferences while preferences are off', () => {
	test('answers 404 when the switch is off', async () => {
		await preferenceSettings().setEnabled(false);

		await ownerAgent.get('/ai-preferences').expect(404);
		await ownerAgent.get('/ai-preferences/count').expect(404);
		await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'Keep replies short.', scope: 'user' })
			.expect(404);
	});

	test('answers 404 before it reads the request', async () => {
		await preferenceSettings().setEnabled(false);

		await ownerAgent.post('/ai-preferences').send({ scope: 'nope' }).expect(404);
	});

	test('answers 404 when n8n Assistant and instance MCP access are both off', async () => {
		setConsumers({});

		await ownerAgent.get('/ai-preferences').expect(404);
	});

	test.each([
		['n8n Assistant', { assistant: true }],
		['instance MCP access', { mcp: true }],
	])('answers while %s is on', async (_, consumers) => {
		setConsumers(consumers);

		await ownerAgent.get('/ai-preferences').expect(200);
	});
});

describe('PATCH /ai-preference-settings', () => {
	test('lets an admin turn preferences off and on, and keeps the data', async () => {
		const preference = await seedPreference(member.id);

		await adminAgent
			.patch('/ai-preference-settings')
			.send({ enabled: false })
			.expect(200, { data: { enabled: false } });
		expect(await savedValue()).toBe('false');
		await memberAgent.get('/ai-preferences').expect(404);

		await adminAgent
			.patch('/ai-preference-settings')
			.send({ enabled: true })
			.expect(200, { data: { enabled: true } });
		const response = await memberAgent.get('/ai-preferences').expect(200);
		expect(response.body.data.data.map(({ id }: { id: string }) => id)).toEqual([preference.id]);
	});

	test('works while preferences are off', async () => {
		await preferenceSettings().setEnabled(false);

		await ownerAgent.patch('/ai-preference-settings').send({ enabled: true }).expect(200);
		expect(preferenceSettings().isEnabled).toBe(true);
	});

	test('refuses a member', async () => {
		await memberAgent.patch('/ai-preference-settings').send({ enabled: false }).expect(403);
		expect(await savedValue()).toBeUndefined();
	});

	test('refuses a change while the env manages preferences', async () => {
		loaderConfig().preferencesManagedByEnv = true;

		await ownerAgent.patch('/ai-preference-settings').send({ enabled: false }).expect(403);
		expect(await savedValue()).toBeUndefined();
	});

	test('rejects a body without a boolean', async () => {
		await ownerAgent.patch('/ai-preference-settings').send({ enabled: 'no' }).expect(400);
	});
});

describe('AiPreferenceSettingsService.init', () => {
	const onEnterprisePlan = (enterprise: boolean) =>
		vi.spyOn(Container.get(License), 'isEnterprisePlan').mockReturnValue(enterprise);

	test('defaults to on outside the enterprise plan and saves nothing', async () => {
		onEnterprisePlan(false);

		await preferenceSettings().init();

		expect(preferenceSettings().isSwitchOn).toBe(true);
		expect(await savedValue()).toBeUndefined();
	});

	test('defaults to off on the enterprise plan without preferences', async () => {
		onEnterprisePlan(true);

		await preferenceSettings().init();

		expect(preferenceSettings().isSwitchOn).toBe(false);
		expect(await savedValue()).toBeUndefined();
	});

	test('keeps preferences on for an enterprise instance that already has them', async () => {
		onEnterprisePlan(true);
		await seedPreference(member.id);

		await preferenceSettings().init();

		expect(preferenceSettings().isSwitchOn).toBe(true);
		expect(await savedValue()).toBe('true');
	});

	test('keeps a saved choice', async () => {
		onEnterprisePlan(true);
		await seedPreference(member.id);
		await preferenceSettings().setEnabled(false);

		await preferenceSettings().init();

		expect(preferenceSettings().isSwitchOn).toBe(false);
		expect(await savedValue()).toBe('false');
	});
});
