import { LicenseState } from '@n8n/backend-common';
import type { RedactableExecution } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { createCredentials, shareCredentialWithProjects } from '@test-integration/db/credentials';
import { createAdmin, createMember, createOwner } from '@test-integration/db/users';

import { ExecutionRedactionService } from '../execution-redaction.service';

/**
 * The instance owner and admins are members of every team project through
 * their instance role, with no project relation. Redaction counts credentials
 * shared with a team project as theirs, but not credentials that only a
 * personal project holds.
 */
describe('ExecutionRedactionService with implicit team project access (integration)', () => {
	mockInstance(InstanceRedactionEnforcementService);
	// Without the data-redaction license no redaction policy applies, so only the
	// credential check can redact.
	mockInstance(LicenseState).isDataRedactionLicensed.mockReturnValue(false);

	const OUTPUT = { email: 'alice@example.com' };

	let redaction: ExecutionRedactionService;
	let owner: User;
	let admin: User;
	let member: User;

	const nodeUsing = (name: string, credentialId: string): INode => ({
		id: name,
		name,
		type: 'n8n-nodes-base.actionNetwork',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { actionNetworkApi: { id: credentialId, name: 'Credential' } },
	});

	const executionUsing = (...credentialIds: string[]): RedactableExecution => ({
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
			nodes: credentialIds.map((id, index) =>
				nodeUsing(index === 0 ? 'Action' : `Action ${index}`, id),
			),
		},
	});

	const processAs = async (user: User, ...credentialIds: string[]) =>
		await redaction.processExecution(executionUsing(...credentialIds), { user });

	const createTeamCredential = async () =>
		await createCredentials(
			{ name: 'Team Action Network', type: 'actionNetworkApi', data: '' },
			await createTeamProject('Project X'),
		);

	const createPersonalCredential = async (user: User) =>
		await createCredentials(
			{ name: 'Personal Action Network', type: 'actionNetworkApi', data: '' },
			await getPersonalProject(user),
		);

	beforeAll(async () => {
		await testDb.init();
		redaction = Container.get(ExecutionRedactionService);
		owner = await createOwner();
		admin = await createAdmin();
		member = await createMember();
	});

	afterEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([
		['owner', () => owner],
		['admin', () => admin],
	])(
		'shows the %s the data of an execution that uses a team project credential',
		async (_, getUser) => {
			const credential = await createTeamCredential();

			const execution = await processAs(getUser(), credential.id);

			expect(execution.data.redactionInfo).toBeUndefined();
			expect(execution.data.resultData.runData.Action[0].data?.main[0]?.[0].json).toEqual(OUTPUT);
		},
	);

	it.each([
		['owner', () => owner],
		['admin', () => admin],
	])(
		'redacts for the %s the data of an execution that uses a personal credential of another user',
		async (_, getUser) => {
			const credential = await createPersonalCredential(member);

			const execution = await processAs(getUser(), credential.id);

			expect(execution.data.redactionInfo).toMatchObject({
				reason: 'credential_inaccessible',
				canReveal: false,
			});
		},
	);

	it('shows the admin the data when a personal credential is shared with a team project', async () => {
		const credential = await createPersonalCredential(member);
		await shareCredentialWithProjects(credential, [await createTeamProject('Project X')]);

		const execution = await processAs(admin, credential.id);

		expect(execution.data.redactionInfo).toBeUndefined();
	});

	it('redacts for the admin when the execution also uses a personal credential', async () => {
		const teamCredential = await createTeamCredential();
		const personalCredential = await createPersonalCredential(member);

		const execution = await processAs(admin, teamCredential.id, personalCredential.id);

		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_inaccessible',
			canReveal: false,
		});
	});

	it('redacts for a member who is not in the team project', async () => {
		const credential = await createTeamCredential();

		const execution = await processAs(member, credential.id);

		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_inaccessible',
			canReveal: false,
		});
	});
});
