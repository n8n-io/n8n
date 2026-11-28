/**
 * Integration test for the run-time credential stubs.
 *
 * A rule that names a `credentialType` makes n8n create a stub credential at startup.
 * The request value is laid over that stub when a node asks for the credential.
 */

import { ModuleRegistry } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IExecutionContext } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import { RuntimeCredentialStubSeeder } from '@/modules/runtime-credentials/runtime-credential-stub.seeder';
import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

const RULES = {
	bearerToken: {
		nodeType: '*',
		path: 'headers.authorization',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
};
const STUB_ID = runtimeStubId('bearerToken');

describe('run-time credential stubs: integration', () => {
	let credentialsRepository: CredentialsRepository;
	let ownerId: string;

	beforeAll(async () => {
		process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
		process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify(RULES);

		await testModules.loadModules(['runtime-credentials']);
		await testDb.init();
		// The seeder checks the rule's credential type, so the types load before the modules.
		await utils.initCredentialsTypes();
		await Container.get(ModuleRegistry).initModules('main');

		credentialsRepository = Container.get(CredentialsRepository);
		ownerId = (await createOwner()).id;
	});

	afterAll(async () => {
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	const contextWith = async (artifacts: Record<string, unknown>) =>
		({
			secureArtifacts: await Container.get(Cipher).encryptV2(
				JSON.stringify({ version: 1, artifacts }),
			),
		}) as unknown as IExecutionContext;

	const getDecrypted = async (executionContext?: IExecutionContext) => {
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ userId: ownerId });
		additionalData.executionContext = executionContext;
		return await Container.get(CredentialsHelper).getDecrypted(
			additionalData,
			{ id: STUB_ID, name: 'Request value: bearerToken' },
			'httpHeaderAuth',
			'webhook',
			undefined,
			true,
		);
	};

	it('creates a global stub credential for the rule at startup', async () => {
		const stub = await credentialsRepository.findOneBy({ id: STUB_ID });

		expect(stub).toMatchObject({
			name: 'Request value: bearerToken',
			type: 'httpHeaderAuth',
			isRuntime: true,
			isGlobal: true,
			usageScope: 'project',
		});
		await expect(credentialsRepository.findGlobalProjectCredentialIds([STUB_ID])).resolves.toEqual([
			STUB_ID,
		]);
	});

	it('does not create a second stub when the seeder runs again', async () => {
		await Container.get(RuntimeCredentialStubSeeder).seed();

		await expect(credentialsRepository.countBy({ id: STUB_ID })).resolves.toBe(1);
	});

	it('lays the request value over the stub when a node asks for the credential', async () => {
		const data = await getDecrypted(await contextWith({ bearerToken: ['Bearer tok-123'] }));

		expect(data).toEqual({ value: 'Bearer tok-123' });
	});

	it('fails with a clear error when the request gave no value', async () => {
		await expect(getDecrypted(await contextWith({}))).rejects.toThrow(
			'Run the workflow through its trigger',
		);
		await expect(getDecrypted(undefined)).rejects.toThrow('Run the workflow through its trigger');
	});

	it('fails when the items gave different values, without naming the values', async () => {
		const error = await getDecrypted(await contextWith({ bearerToken: ['one-x', 'two-y'] })).catch(
			(e: Error) => e,
		);

		expect((error as Error).message).toContain('"bearerToken" (headers.authorization)');
		expect((error as Error).message).not.toMatch(/one-x|two-y/);
	});
});
