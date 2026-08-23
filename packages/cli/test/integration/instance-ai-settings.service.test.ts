import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import {
	CredentialsRepository,
	InstanceCredentialAssignmentRepository,
	SettingsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import {
	INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
	INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
	INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
	INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
	InstanceAiSettingsService,
} from '@/modules/instance-ai/instance-ai-settings.service';

import { createOwner } from './shared/db/users';
import { initCredentialsTypes } from './shared/utils';

describe('InstanceAiSettingsService (integration)', () => {
	let service: InstanceAiSettingsService;
	let credentialsRepository: CredentialsRepository;
	let assignmentRepository: InstanceCredentialAssignmentRepository;
	let settingsRepository: SettingsRepository;
	let owner: User;

	const modelUpdate = {
		modelConnection: { type: 'openAiApi', data: { apiKey: 'test-key' } },
		modelName: 'gpt-5',
	};

	beforeAll(async () => {
		await testDb.init();
		await initCredentialsTypes();

		// The instance-ai module is not booted here; register its credential uses directly.
		const broker = Container.get(InstanceCredentialBroker);
		broker.registerUse(INSTANCE_AI_MODEL_CREDENTIAL_POLICY);
		broker.registerUse(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY);
		broker.registerUse(INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY);
		broker.registerUse(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY);

		service = Container.get(InstanceAiSettingsService);
		credentialsRepository = Container.get(CredentialsRepository);
		assignmentRepository = Container.get(InstanceCredentialAssignmentRepository);
		settingsRepository = Container.get(SettingsRepository);
		owner = await createOwner();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await testDb.truncate(['InstanceCredentialAssignment', 'CredentialsEntity', 'Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('saves the credential, assignment, and settings together', async () => {
		const result = await service.updateAdminSettings(modelUpdate, owner);

		expect(result.modelCredentialId).toEqual(expect.any(String));
		expect(result.modelName).toBe('gpt-5');
		const credentials = await credentialsRepository.findBy({ usageScope: 'instance' });
		expect(credentials).toHaveLength(1);
		expect(credentials[0].id).toBe(result.modelCredentialId);
		await expect(
			assignmentRepository.findAssignedCredentialId(INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id),
		).resolves.toBe(result.modelCredentialId);
		const persisted = await settingsRepository.findByKey('instanceAi.settings');
		expect(persisted?.value).toContain('"modelName":"gpt-5"');
	});

	it('rolls back the credential and assignment when the settings write fails', async () => {
		vi.spyOn(settingsRepository, 'upsertByKey').mockRejectedValueOnce(
			new Error('settings write failed'),
		);

		await expect(service.updateAdminSettings(modelUpdate, owner)).rejects.toThrow(
			'settings write failed',
		);

		await expect(credentialsRepository.findBy({ usageScope: 'instance' })).resolves.toHaveLength(0);
		await expect(
			assignmentRepository.findAssignedCredentialId(INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id),
		).resolves.toBeNull();
		await expect(settingsRepository.findByKey('instanceAi.settings')).resolves.toBeNull();
	});

	it('keeps the previous credential when a replacing update fails at the settings write', async () => {
		const credential = await Container.get(CredentialsService).createInstanceCredential(
			{
				name: 'AI Assistant model',
				type: 'openAiApi',
				data: { apiKey: 'test-key' },
				usageScope: 'instance',
			},
			owner,
			{},
		);
		const credentialId = credential.id;
		await assignmentRepository.assignCredential(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
			credentialId,
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY.credentialTypes,
		);
		await settingsRepository.upsertByKey(
			'instanceAi.settings',
			JSON.stringify({ modelName: 'gpt-5' }),
			true,
			{},
		);
		const before = await credentialsRepository.findOneByOrFail({ id: credentialId });
		vi.spyOn(settingsRepository, 'upsertByKey').mockRejectedValueOnce(
			new Error('settings write failed'),
		);

		await expect(
			service.updateAdminSettings(
				{
					modelConnection: { type: 'openAiApi', data: { apiKey: 'rotated-key' } },
					modelName: 'gpt-5',
				},
				owner,
			),
		).rejects.toThrow('settings write failed');

		const after = await credentialsRepository.findOneByOrFail({ id: credentialId });
		expect(after.data).toBe(before.data);
		await expect(
			assignmentRepository.findAssignedCredentialId(INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id),
		).resolves.toBe(credentialId);
	});

	it('keeps stored secrets when updating a redacted connection', async () => {
		const created = await service.updateAdminSettings(modelUpdate, owner);

		const updated = await service.updateAdminSettings(
			{
				modelConnection: {
					type: 'openAiApi',
					data: { apiKey: CREDENTIAL_BLANKING_VALUE },
				},
				modelName: 'gpt-5.1',
			},
			owner,
		);

		expect(updated.modelCredentialId).toBe(created.modelCredentialId);
		const credential = await credentialsRepository.findOneByOrFail({
			id: created.modelCredentialId!,
		});
		await expect(
			Container.get(CredentialsService).decrypt(credential, true),
		).resolves.toMatchObject({
			apiKey: 'test-key',
		});
	});

	it('does not update workflow credentials through the instance-scoped repository update', async () => {
		const workflowCredential = await credentialsRepository.save(
			credentialsRepository.create({
				name: 'Workflow credential',
				type: 'openAiApi',
				data: 'workflow-encrypted',
				usageScope: 'project',
			}),
		);

		const updated = await credentialsRepository.updateInstanceCredential(
			workflowCredential.id,
			{
				id: workflowCredential.id,
				name: 'Hijacked',
				type: workflowCredential.type,
				data: 'other-encrypted',
			},
			{},
		);

		expect(updated).toBeNull();
		await expect(
			credentialsRepository.findOneByOrFail({ id: workflowCredential.id }),
		).resolves.toMatchObject({ name: 'Workflow credential', data: 'workflow-encrypted' });
	});
});
