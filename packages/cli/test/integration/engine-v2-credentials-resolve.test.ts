import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { EngineConfig } from '@n8n/config';
import type { CredentialsEntity, IWorkflowDb, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mintActionToken } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type { IExecuteData, INode } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { EngineControlPlaneServer } from '@/modules/engine-v2/engine-control-plane-server';
import { EngineCredentialsClient } from '@/modules/engine-v2/engine-credentials-client';
import type { ResolveCredentialRequest } from '@/modules/engine-v2/engine-credentials.contract';
import { CREDENTIALS_RESOLVE_PATH } from '@/modules/engine-v2/engine-v2.constants';
import { RemoteCredentialsHelper } from '@/modules/engine-v2/remote-credentials-helper';

import { saveCredential } from './shared/db/credentials';
import { createMember, createOwner } from './shared/db/users';
import { initCredentialsTypes } from './shared/utils';

/**
 * The data plane side (`RemoteCredentialsHelper` and `EngineCredentialsClient`)
 * against the real control plane server, `CredentialsHelper` and test database.
 */
describe('Engine v2 credential resolve (integration)', () => {
	const authSecret = 'a'.repeat(64);
	const decrypted = { name: 'X-Api-Key', value: 'secret' };

	let server: EngineControlPlaneServer;
	let baseUrl: string;
	/** Runs the workflow. A member, because an instance owner may use every credential. */
	let member: User;
	let workflow: IWorkflowDb;
	let memberCredential: CredentialsEntity;
	let ownerCredential: CredentialsEntity;

	const httpRequestNode = { type: 'n8n-nodes-base.httpRequest' } as INode;
	const executeData: IExecuteData = { node: httpRequestNode, data: {}, source: null };

	beforeAll(async () => {
		await testDb.init();
		await initCredentialsTypes();

		// `CredentialsHelper` asks the license whether external secrets are on.
		const licenseState = mock<LicenseState>();
		licenseState.isLicensed.mockReturnValue(false);
		Container.set(LicenseState, licenseState);

		const engineConfig = Container.get(EngineConfig);
		engineConfig.authSecret = authSecret;
		engineConfig.controlPlaneHost = '127.0.0.1';
		// `0` lets the OS pick a free port.
		engineConfig.controlPlanePort = 0;

		server = Container.get(EngineControlPlaneServer);
		await server.start();
		baseUrl = `http://127.0.0.1:${server.port}`;
		// Set before the client is first resolved, because it reads the URL once.
		engineConfig.controlPlaneBaseUrl = baseUrl;

		const owner = await createOwner();
		member = await createMember();
		workflow = await createWorkflow({}, member);
		memberCredential = await saveCredential(
			{ name: 'Acme API', type: 'httpHeaderAuth', data: decrypted },
			{ user: member, role: 'credential:owner' },
		);
		ownerCredential = await saveCredential(
			{ name: 'Owner API', type: 'httpHeaderAuth', data: decrypted },
			{ user: owner, role: 'credential:owner' },
		);
	});

	afterAll(async () => {
		await server.stop();
		await testDb.terminate();
	});

	const newHelper = () => {
		const context: AdditionalDataContext = {
			executionId: 'exec-1',
			workflowId: workflow.id,
			mode: 'manual',
			userId: member.id,
		};
		return new RemoteCredentialsHelper(
			Container.get(EngineCredentialsClient),
			Container.get(CredentialsHelper),
			Container.get(CredentialTypes),
			context,
			new AbortController().signal,
		);
	};

	it("returns the decrypted data of a credential shared with the workflow's project", async () => {
		const data = await newHelper().getDecrypted(
			mock(),
			{ id: memberCredential.id, name: memberCredential.name },
			'httpHeaderAuth',
			'manual',
			executeData,
		);

		expect(data).toMatchObject(decrypted);
	});

	it('refuses a credential that is not shared with the workflow', async () => {
		const request = newHelper().getDecrypted(
			mock(),
			{ id: ownerCredential.id, name: ownerCredential.name },
			'httpHeaderAuth',
			'manual',
			executeData,
		);

		await expect(request).rejects.toThrow(OperationalError);
		// The client reports the status only in the message. 403 shows the access
		// check refused the credential; a 404 would mean it reached the store.
		await expect(request).rejects.toThrow('403');
	});

	it('refuses a lifecycle token', async () => {
		const body: ResolveCredentialRequest = {
			credential: { id: memberCredential.id, name: memberCredential.name, type: 'httpHeaderAuth' },
			execution: { executionId: 'exec-1', workflowId: workflow.id, mode: 'manual' },
			context: { userId: member.id },
			consumer: { nodeType: httpRequestNode.type },
		};

		const headers = new Headers();
		headers.set('content-type', 'application/json');
		headers.set('authorization', `Bearer ${mintActionToken(authSecret, 'lifecycle-events:write')}`);
		const response = await fetch(`${baseUrl}${CREDENTIALS_RESOLVE_PATH}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		expect(response.status).toBe(401);
	});
});
