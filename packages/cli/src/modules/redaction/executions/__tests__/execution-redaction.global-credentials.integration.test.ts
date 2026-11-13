import { LicenseState } from '@n8n/backend-common';
import type { RedactableExecution } from '@n8n/backend-services';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createRunExecutionData } from 'n8n-workflow';

import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { createCredentials } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';

import { ExecutionRedactionService } from '../execution-redaction.service';

/**
 * Every user may use a global credential. Redaction asks for the viewer's own
 * access, so it has to count global credentials too.
 */
describe('ExecutionRedactionService with global credentials (integration)', () => {
	mockInstance(InstanceRedactionEnforcementService);
	// Without the data-redaction license no redaction policy applies, so only the
	// credential check can redact.
	mockInstance(LicenseState).isDataRedactionLicensed.mockReturnValue(false);

	const OUTPUT = { email: 'alice@example.com' };

	let redaction: ExecutionRedactionService;
	let owner: User;
	let member: User;

	const executionUsing = (credentialId: string): RedactableExecution => ({
		id: 'execution-1',
		mode: 'manual',
		workflowId: 'workflow-1',
		data: createRunExecutionData({
			resultData: {
				runData: {
					Action: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: OUTPUT }]] },
						},
					],
				},
			},
		}),
		workflowData: {
			settings: {},
			nodes: [
				{
					id: 'action',
					name: 'Action',
					type: 'n8n-nodes-base.actionNetwork',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: { actionNetworkApi: { id: credentialId, name: 'Credential' } },
				},
			],
		},
	});

	beforeAll(async () => {
		await testDb.init();
		redaction = Container.get(ExecutionRedactionService);
		owner = await createOwner();
		member = await createMember();
	});

	afterEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('shows a member the data of an execution that uses a global credential', async () => {
		const credentialProject = await createTeamProject();
		const credential = await createCredentials(
			{ name: 'Global Action Network', type: 'actionNetworkApi', data: '', isGlobal: true },
			credentialProject,
		);

		const execution = await redaction.processExecution(executionUsing(credential.id), {
			user: member,
		});

		expect(execution.data.redactionInfo).toBeUndefined();
		expect(execution.data.resultData.runData.Action[0].data?.main[0]?.[0].json).toEqual(OUTPUT);
	});

	it('redacts the data of an execution that uses a credential the member cannot use', async () => {
		const credentialProject = await createTeamProject('Credential home', owner);
		const credential = await createCredentials(
			{ name: 'Team Action Network', type: 'actionNetworkApi', data: '' },
			credentialProject,
		);

		const execution = await redaction.processExecution(executionUsing(credential.id), {
			user: member,
		});

		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_inaccessible',
			canReveal: false,
		});
	});

	it('shows the data once the member can use the credential through a project', async () => {
		const credentialProject = await createTeamProject('Credential home', owner);
		await linkUserToProject(member, credentialProject, 'project:editor');
		const credential = await createCredentials(
			{ name: 'Team Action Network', type: 'actionNetworkApi', data: '' },
			credentialProject,
		);

		const execution = await redaction.processExecution(executionUsing(credential.id), {
			user: member,
		});

		expect(execution.data.redactionInfo).toBeUndefined();
	});
});
