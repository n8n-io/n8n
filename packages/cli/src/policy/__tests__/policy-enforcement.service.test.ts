import type { PolicedWorkflow, PolicyDecision, PolicyViolation } from '@n8n/decorators';
import { workflowContentSubject } from '@n8n/decorators';
import { UnexpectedError } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { PolicyActor, PolicyEnforcementBackend } from '../policy-enforcement-backend';
import { PolicyEnforcementService } from '../policy-enforcement.service';
import { PolicyViolationError } from '../policy-violation.error';

vi.mock('@/node-execution/resolve-tool-node-type', () => ({
	resolveToolNodeType: (nodeType: string) => nodeType,
}));

const savedWorkflow: PolicedWorkflow = { id: 'wf-1', name: 'My workflow', nodes: [] };

const violation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'The node type n8n-nodes-base.slack is not available on this instance',
};

const cleared: PolicyDecision = { violations: [] };

/** One call per point, so a new point can't be left out of the no-op guarantee. */
const enforceCalls = (service: PolicyEnforcementService) => ({
	workflowSave: async () =>
		await service.enforceWorkflowSave(
			{
				workflow: savedWorkflow,
				storedWorkflow: null,
				projectId: 'proj-1',
			},
			{ kind: 'system', reason: 'execution' },
		),
	workflowPublish: async () =>
		await service.enforceWorkflowPublish(
			{ workflow: savedWorkflow, projectId: 'proj-1' },
			{ kind: 'system', reason: 'execution' },
		),
	workflowStart: async () =>
		await service.enforceWorkflowStart(
			{ workflow: savedWorkflow, projectId: 'proj-1' },
			{ kind: 'system', reason: 'execution' },
		),
	workflowTransfer: async () =>
		await service.enforceWorkflowTransfer(
			{
				workflow: savedWorkflow,
				targetProjectId: 'proj-2',
			},
			{ kind: 'system', reason: 'execution' },
		),
	credentialSave: async () =>
		await service.enforceCredentialSave(
			{
				credential: { id: null, type: 'slackApi' },
				storedCredential: null,
				projectId: 'proj-1',
			},
			{ kind: 'system', reason: 'execution' },
		),
	credentialTransfer: async () =>
		await service.enforceCredentialTransfer(
			{
				credential: { id: 'cred-1', type: 'slackApi' },
				targetProjectId: 'proj-2',
			},
			{ kind: 'system', reason: 'execution' },
		),
	credentialDecrypt: async () =>
		await service.enforceCredentialDecrypt(
			{
				credentialType: 'slackApi',
				credentialId: 'cred-1',
				consumer: null,
				projectId: 'proj-1',
			},
			{ kind: 'system', reason: 'execution' },
		),
	contentImport: async () =>
		await service.enforceContentImport(
			{
				workflow: savedWorkflow,
				projectId: 'proj-1',
				transport: 'cli',
			},
			{ kind: 'system', reason: 'execution' },
		),
});

const evaluateCalls = (service: PolicyEnforcementService) => ({
	workflowSave: async () =>
		await service.evaluateWorkflowSave({
			workflow: savedWorkflow,
			storedWorkflow: null,
			projectId: 'proj-1',
		}),
	workflowPublish: async () =>
		await service.evaluateWorkflowPublish({ workflow: savedWorkflow, projectId: 'proj-1' }),
	workflowStart: async () =>
		await service.evaluateWorkflowStart({ workflow: savedWorkflow, projectId: 'proj-1' }),
	workflowTransfer: async () =>
		await service.evaluateWorkflowTransfer({
			workflow: savedWorkflow,
			targetProjectId: 'proj-2',
		}),
	credentialSave: async () =>
		await service.evaluateCredentialSave({
			credential: { id: null, type: 'slackApi' },
			storedCredential: null,
			projectId: 'proj-1',
		}),
	credentialTransfer: async () =>
		await service.evaluateCredentialTransfer({
			credential: { id: 'cred-1', type: 'slackApi' },
			targetProjectId: 'proj-2',
		}),
	credentialDecrypt: async () =>
		await service.evaluateCredentialDecrypt({
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			consumer: null,
			projectId: 'proj-1',
		}),
	contentImport: async () =>
		await service.evaluateContentImport({
			workflow: savedWorkflow,
			projectId: 'proj-1',
			transport: 'cli',
		}),
});

describe('PolicyEnforcementService', () => {
	describe('with no implementation registered', () => {
		const service = new PolicyEnforcementService();

		test.each(Object.entries(enforceCalls(service)))(
			'%s clears without throwing',
			async (point, call) => {
				const token = await call();

				expect(token.point).toBe(point);
				expect(token.decision).toEqual(cleared);
			},
		);

		test.each(Object.entries(evaluateCalls(service)))(
			'%s evaluates to an empty decision',
			async (_point, call) => {
				expect(await call()).toEqual({ violations: [] });
			},
		);

		it('hands out a fresh decision each call, so one caller cannot affect the next', async () => {
			const first = await service.evaluateWorkflowStart({
				workflow: savedWorkflow,
				projectId: null,
			});
			first.violations.push(violation);

			const second = await service.evaluateWorkflowStart({
				workflow: savedWorkflow,
				projectId: null,
			});

			expect(second.violations).toEqual([]);
		});

		it('reports no checks for any point', () => {
			expect(service.hasChecksFor('workflowStart')).toBe(false);
			expect(service.hasChecksFor('credentialDecrypt')).toBe(false);
		});
	});

	describe('setImplementation', () => {
		it('refuses a second implementation', () => {
			const service = new PolicyEnforcementService();
			service.setImplementation(mock<PolicyEnforcementBackend>());

			expect(() => service.setImplementation(mock<PolicyEnforcementBackend>())).toThrow(
				UnexpectedError,
			);
		});
	});

	describe('with an implementation registered', () => {
		let service: PolicyEnforcementService;
		let backend: MockProxy<PolicyEnforcementBackend>;

		beforeEach(() => {
			backend = mock<PolicyEnforcementBackend>();
			service = new PolicyEnforcementService();
			service.setImplementation(backend);
		});

		it('asks the implementation about the point it was given', () => {
			backend.hasChecksFor.mockReturnValue(true);

			expect(service.hasChecksFor('workflowStart')).toBe(true);
			expect(backend.hasChecksFor).toHaveBeenCalledExactlyOnceWith('workflowStart');
		});

		it('throws with every violation instead of minting', async () => {
			const second = { ...violation, subject: 'n8n-nodes-base.code' };
			backend.enforce.mockResolvedValue({ violations: [violation, second] });

			const error = await service
				.enforceWorkflowSave(
					{ workflow: savedWorkflow, storedWorkflow: null, projectId: null },
					{ kind: 'system', reason: 'execution' },
				)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyViolationError);
			expect((error as PolicyViolationError).violations).toEqual([violation, second]);
		});

		it('passes the point, context and actor through and mints the decision it got back', async () => {
			const decision: PolicyDecision = {
				violations: [],
				policyVersions: [{ scope: 'instance', version: 7 }],
			};
			backend.enforce.mockResolvedValue(decision);
			const context = { workflow: savedWorkflow, storedWorkflow: null, projectId: 'proj-1' };

			const actor: PolicyActor = { kind: 'user', user: { id: 'user-1' } };

			const token = await service.enforceWorkflowSave(context, actor);

			expect(backend.enforce).toHaveBeenCalledWith('workflowSave', context, actor);
			expect(token.decision).toBe(decision);
			expect(token.policyVersions).toEqual([{ scope: 'instance', version: 7 }]);
		});

		it('returns the advisory decision as-is, violations and all', async () => {
			const decision: PolicyDecision = {
				violations: [violation],
				checkErrors: [{ checkId: 'flaky', correlationId: 'abc' }],
			};
			backend.evaluate.mockResolvedValue(decision);
			const context = { workflow: savedWorkflow, projectId: null, transport: 'cli' } as const;

			expect(await service.evaluateContentImport(context)).toBe(decision);
			expect(backend.evaluate).toHaveBeenCalledWith('contentImport', context);
		});
	});

	describe('inline agents', () => {
		const actor: PolicyActor = { kind: 'user', user: { id: 'user-1' } };
		let service: PolicyEnforcementService;
		let backend: MockProxy<PolicyEnforcementBackend>;

		const withInlineAgent: PolicedWorkflow = {
			id: 'wf-1',
			name: 'My workflow',
			nodes: [
				{
					id: 'n1',
					name: 'Message an Agent',
					type: 'n8n-nodes-base.messageAnAgent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						agentSource: 'inline',
						inlineAgent: {
							config: {
								tools: [
									{
										type: 'node',
										name: 'Current date',
										node: { nodeType: 'n8n-nodes-base.dateTime', nodeTypeVersion: 2 },
									},
								],
							},
						},
					},
				},
			],
		};

		const checkedTypes = (call: unknown[]) =>
			(call[1] as { workflow: PolicedWorkflow }).workflow.nodes.map((node) => node.type);

		const expectedTypes = ['n8n-nodes-base.messageAnAgent', 'n8n-nodes-base.dateTime'];

		beforeEach(() => {
			backend = mock<PolicyEnforcementBackend>();
			backend.enforce.mockResolvedValue(cleared);
			backend.evaluate.mockResolvedValue(cleared);
			service = new PolicyEnforcementService();
			service.setImplementation(backend);
		});

		it.each([
			[
				'workflowPublish',
				async (s: PolicyEnforcementService) =>
					await s.enforceWorkflowPublish({ workflow: withInlineAgent, projectId: 'proj-1' }, actor),
			],
			[
				'workflowStart',
				async (s: PolicyEnforcementService) =>
					await s.enforceWorkflowStart({ workflow: withInlineAgent, projectId: 'proj-1' }, actor),
			],
			[
				'workflowTransfer',
				async (s: PolicyEnforcementService) =>
					await s.enforceWorkflowTransfer(
						{ workflow: withInlineAgent, targetProjectId: 'proj-2' },
						actor,
					),
			],
			[
				'contentImport',
				async (s: PolicyEnforcementService) =>
					await s.enforceContentImport(
						{ workflow: withInlineAgent, projectId: 'proj-1', transport: 'cli' },
						actor,
					),
			],
		] as const)('shows the checks the inline agent tools at %s', async (_point, enforce) => {
			await enforce(service);

			expect(checkedTypes(backend.enforce.mock.calls[0])).toEqual(expectedTypes);
		});

		it('expands the stored workflow too, so existing inline tools are grandfathered on save', async () => {
			await service.enforceWorkflowSave(
				{
					workflow: withInlineAgent,
					storedWorkflow: withInlineAgent,
					projectId: 'proj-1',
				},
				actor,
			);

			const context = backend.enforce.mock.calls[0][1] as {
				storedWorkflow: PolicedWorkflow;
			};
			expect(checkedTypes(backend.enforce.mock.calls[0])).toEqual(expectedTypes);
			expect(context.storedWorkflow.nodes.map((node) => node.type)).toEqual(expectedTypes);
		});

		it('expands for evaluate as well as enforce', async () => {
			await service.evaluateWorkflowPublish({ workflow: withInlineAgent, projectId: 'proj-1' });

			expect(checkedTypes(backend.evaluate.mock.calls[0])).toEqual(expectedTypes);
		});

		// The repository seal hashes the nodes it writes, so the clearance must match those.
		it('binds a create to the nodes the host writes, not the expanded ones', async () => {
			const created = { ...withInlineAgent, id: null };

			const token = await service.enforceWorkflowSave(
				{
					workflow: created,
					storedWorkflow: null,
					projectId: 'proj-1',
				},
				actor,
			);

			expect(token.subject).toEqual(workflowContentSubject(created));
		});
	});

	describe('subject binding', () => {
		const service = new PolicyEnforcementService();

		it('binds a saved workflow to its id', async () => {
			const token = await service.enforceWorkflowStart(
				{
					workflow: savedWorkflow,
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject).toEqual({ type: 'workflow', id: 'wf-1' });
		});

		it('binds an unsaved workflow to a hash of its nodes', async () => {
			const unsaved: PolicedWorkflow = { id: null, name: 'New', nodes: [] };

			const token = await service.enforceWorkflowSave(
				{
					workflow: unsaved,
					storedWorkflow: null,
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject.type).toBe('workflow');
			expect(token.subject.id).toMatch(/^[0-9a-f]{64}$/);
		});

		// A create can carry a client-supplied id (POST /workflows allows it), but that id is no
		// proof of what was checked, so the save still binds to the content.
		it('binds a create with a supplied id to a hash of its nodes', async () => {
			const withClientId: PolicedWorkflow = { id: 'wf-client', name: 'New', nodes: [] };

			const token = await service.enforceWorkflowSave(
				{
					workflow: withClientId,
					storedWorkflow: null,
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject.id).toMatch(/^[0-9a-f]{64}$/);
			expect(token.subject.id).not.toBe('wf-client');
		});

		it('gives two unsaved workflows with different nodes different subjects', async () => {
			const enforce = async (nodes: PolicedWorkflow['nodes']) =>
				await service.enforceWorkflowSave(
					{
						workflow: { id: null, name: 'New', nodes },
						storedWorkflow: null,
						projectId: null,
					},
					{ kind: 'system', reason: 'execution' },
				);

			const empty = await enforce([]);
			const withNode = await enforce([mock<PolicedWorkflow['nodes'][number]>({ type: 'slack' })]);

			expect(empty.subject.id).not.toBe(withNode.subject.id);
		});

		it('binds an agent to its id with the agent subject type', async () => {
			const token = await service.enforceWorkflowPublish(
				{
					workflow: { id: 'agent-1', name: 'Support agent', nodes: [], artifactKind: 'agent' },
					projectId: 'proj-1',
				},
				{ kind: 'user', user: { id: 'user-1' } },
			);

			expect(token.subject).toEqual({ type: 'agent', id: 'agent-1' });
		});

		it('binds a credential create to a hash of its type', async () => {
			const token = await service.enforceCredentialSave(
				{
					credential: { id: null, type: 'slackApi' },
					storedCredential: null,
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject.type).toBe('credential');
			expect(token.subject.id).toMatch(/^[0-9a-f]{64}$/);
		});

		it('binds a credential update to the row id', async () => {
			const token = await service.enforceCredentialSave(
				{
					credential: { id: 'cred-1', type: 'slackApi' },
					storedCredential: { id: 'cred-1', type: 'slackApi' },
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject).toEqual({ type: 'credential', id: 'cred-1' });
		});

		it('binds a credential decrypt to the credential', async () => {
			const token = await service.enforceCredentialDecrypt(
				{
					credentialType: 'slackApi',
					credentialId: 'cred-1',
					consumer: { nodeType: 'n8n-nodes-base.slack' },
					projectId: null,
				},
				{ kind: 'system', reason: 'execution' },
			);

			expect(token.subject).toEqual({ type: 'credential', id: 'cred-1' });
		});
	});
});
