import { LicenseState } from '@n8n/backend-common';
import type { RedactableExecution } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ScopeForbiddenError } from '@n8n/errors';
import type { INode, IRunData } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { createCredentials } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';

import { ExecutionRedactionService } from '../execution-redaction.service';

/**
 * Nobody can use a credential that was deleted. Its past executions stay
 * redacted, but a user with the `execution:reveal` scope on the workflow can
 * reveal them. Without that, deleting a credential would hide its executions
 * from everyone, permanently.
 */
describe('ExecutionRedactionService with deleted credentials (integration)', () => {
	mockInstance(InstanceRedactionEnforcementService);
	// Without the data-redaction license no redaction policy applies, so only the
	// credential check can redact.
	mockInstance(LicenseState).isDataRedactionLicensed.mockReturnValue(false);

	const OUTPUT = { email: 'alice@example.com' };

	let redaction: ExecutionRedactionService;
	let owner: User;
	let editor: User;

	const nodeUsing = (name: string, credentialId: string): INode => ({
		id: name,
		name,
		type: 'n8n-nodes-base.actionNetwork',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { actionNetworkApi: { id: credentialId, name: 'Credential' } },
	});

	const runData = (usedCredentialIds?: string[]): IRunData => ({
		Action: [
			{
				startTime: 1,
				executionTime: 1,
				executionIndex: 0,
				source: [],
				data: { main: [[{ json: OUTPUT }]] },
				...(usedCredentialIds && { usedCredentialIds }),
			},
		],
	});

	const executionUsing = (workflowId: string, ...credentialIds: string[]): RedactableExecution => ({
		id: 'execution-1',
		mode: 'manual',
		workflowId,
		data: createRunExecutionData({ resultData: { runData: runData() } }),
		workflowData: {
			settings: {},
			nodes: credentialIds.map((id, index) =>
				nodeUsing(index === 0 ? 'Action' : `Action ${index}`, id),
			),
		},
	});

	/** A parent execution: its own nodes use no credential, a sub-workflow reported one. */
	const parentExecutionReporting = (
		workflowId: string,
		credentialId: string,
	): RedactableExecution => ({
		id: 'execution-2',
		mode: 'manual',
		workflowId,
		data: createRunExecutionData({ resultData: { runData: runData([credentialId]) } }),
		workflowData: { settings: {}, nodes: [] },
	});

	const createDeletedCredential = async () => {
		const credential = await createCredentials(
			{ name: 'Deleted Action Network', type: 'actionNetworkApi', data: '' },
			await createTeamProject('Credential home', owner),
		);
		await Container.get(CredentialsRepository).delete({ id: credential.id });
		return credential.id;
	};

	const outputOf = (execution: RedactableExecution) =>
		execution.data.resultData.runData.Action[0].data?.main[0]?.[0].json;

	beforeAll(async () => {
		await testDb.init();
		redaction = Container.get(ExecutionRedactionService);
		owner = await createOwner();
		editor = await createMember();
	});

	afterEach(async () => {
		// Projects stay: the owner's personal project is created once, in beforeAll.
		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'SharedCredentials',
			'CredentialsEntity',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('redacts an execution that used a deleted credential and lets the owner reveal it', async () => {
		const deletedId = await createDeletedCredential();
		const workflow = await createWorkflow({}, owner);

		const execution = await redaction.processExecution(executionUsing(workflow.id, deletedId), {
			user: owner,
		});

		expect(execution.data.redactionInfo).toEqual({
			isRedacted: true,
			reason: 'credential_deleted',
			canReveal: true,
		});
		expect(outputOf(execution)).toEqual({});
	});

	it('reveals an execution that used a deleted credential to the owner', async () => {
		const deletedId = await createDeletedCredential();
		const workflow = await createWorkflow({}, owner);

		const execution = await redaction.processExecution(executionUsing(workflow.id, deletedId), {
			user: owner,
			redactExecutionData: false,
		});

		expect(execution.data.redactionInfo).toBeUndefined();
		expect(outputOf(execution)).toEqual(OUTPUT);
	});

	it('lets the owner reveal a parent execution whose sub-workflow used a deleted credential', async () => {
		const deletedId = await createDeletedCredential();
		const workflow = await createWorkflow({}, owner);

		const execution = await redaction.processExecution(
			parentExecutionReporting(workflow.id, deletedId),
			{ user: owner },
		);

		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_deleted',
			canReveal: true,
		});
	});

	it('does not let a project editor without the reveal scope reveal it', async () => {
		const deletedId = await createDeletedCredential();
		const project = await createTeamProject('Workflow home', owner);
		await linkUserToProject(editor, project, 'project:editor');
		const workflow = await createWorkflow({}, project);

		const execution = await redaction.processExecution(executionUsing(workflow.id, deletedId), {
			user: editor,
		});
		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_deleted',
			canReveal: false,
		});

		await expect(
			redaction.processExecution(executionUsing(workflow.id, deletedId), {
				user: editor,
				redactExecutionData: false,
			}),
		).rejects.toThrow(ScopeForbiddenError);
	});

	describe('on a run that the viewer made with a dynamic credential', () => {
		/** Marks the run as one that `user` made with a dynamic credential. */
		const ranBy = (execution: RedactableExecution, user: User) => {
			execution.data.executionData!.runtimeData = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
				usesDynamicCredentials: true,
				executedByUserId: user.id,
			};
			return execution;
		};

		it('still requires the reveal scope', async () => {
			// The editor is not a member of the credential's project, so before the
			// deletion this run was redacted for them and they could not reveal it.
			const deletedId = await createDeletedCredential();
			const project = await createTeamProject('Workflow home', owner);
			await linkUserToProject(editor, project, 'project:editor');
			const workflow = await createWorkflow({}, project);

			const execution = await redaction.processExecution(
				ranBy(executionUsing(workflow.id, deletedId), editor),
				{ user: editor },
			);
			expect(execution.data.redactionInfo).toMatchObject({
				reason: 'credential_deleted',
				canReveal: false,
			});

			await expect(
				redaction.processExecution(ranBy(executionUsing(workflow.id, deletedId), editor), {
					user: editor,
					redactExecutionData: false,
				}),
			).rejects.toThrow(ScopeForbiddenError);
		});

		it('lets the user reveal it when they have the reveal scope', async () => {
			const deletedId = await createDeletedCredential();
			const workflow = await createWorkflow({}, owner);

			const execution = await redaction.processExecution(
				ranBy(executionUsing(workflow.id, deletedId), owner),
				{ user: owner, redactExecutionData: false },
			);

			expect(outputOf(execution)).toEqual(OUTPUT);
		});
	});

	it('keeps an existing credential the viewer cannot use as the reason, and lists only that one', async () => {
		const deletedId = await createDeletedCredential();
		const otherProject = await createTeamProject('Other credential home');
		const inaccessible = await createCredentials(
			{ name: 'Team Action Network', type: 'actionNetworkApi', data: '' },
			otherProject,
		);
		const project = await createTeamProject('Workflow home', owner);
		await linkUserToProject(editor, project, 'project:admin');
		const workflow = await createWorkflow({}, project);

		const execution = await redaction.processExecution(
			executionUsing(workflow.id, deletedId, inaccessible.id),
			{ user: editor },
		);

		expect(execution.data.redactionInfo).toMatchObject({
			reason: 'credential_inaccessible',
			canReveal: false,
			credentialIds: [inaccessible.id],
		});
	});
});
