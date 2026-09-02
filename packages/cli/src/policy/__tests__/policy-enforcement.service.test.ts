import type { PolicedWorkflow, PolicyDecision, PolicyViolation } from '@n8n/decorators';
import { UnexpectedError } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { PolicyEnforcementBackend } from '../policy-enforcement-backend';
import { PolicyEnforcementService } from '../policy-enforcement.service';
import { PolicyViolationError } from '../policy-violation.error';

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
		await service.enforceWorkflowSave({
			workflow: savedWorkflow,
			storedWorkflow: null,
			projectId: 'proj-1',
		}),
	workflowPublish: async () =>
		await service.enforceWorkflowPublish({ workflow: savedWorkflow, projectId: 'proj-1' }),
	workflowStart: async () =>
		await service.enforceWorkflowStart({ workflow: savedWorkflow, projectId: 'proj-1' }),
	workflowTransfer: async () =>
		await service.enforceWorkflowTransfer({
			workflow: savedWorkflow,
			targetProjectId: 'proj-2',
		}),
	credentialDecrypt: async () =>
		await service.enforceCredentialDecrypt({
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			consumer: null,
			projectId: 'proj-1',
		}),
	contentImport: async () =>
		await service.enforceContentImport({ workflow: savedWorkflow, projectId: 'proj-1' }),
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
	credentialDecrypt: async () =>
		await service.evaluateCredentialDecrypt({
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			consumer: null,
			projectId: 'proj-1',
		}),
	contentImport: async () =>
		await service.evaluateContentImport({ workflow: savedWorkflow, projectId: 'proj-1' }),
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
				.enforceWorkflowSave({ workflow: savedWorkflow, storedWorkflow: null, projectId: null })
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyViolationError);
			expect((error as PolicyViolationError).violations).toEqual([violation, second]);
		});

		it('passes the point and context through and mints the decision it got back', async () => {
			const decision: PolicyDecision = {
				violations: [],
				policyVersions: [{ scope: 'instance', version: 7 }],
			};
			backend.enforce.mockResolvedValue(decision);
			const context = { workflow: savedWorkflow, storedWorkflow: null, projectId: 'proj-1' };

			const token = await service.enforceWorkflowSave(context);

			expect(backend.enforce).toHaveBeenCalledWith('workflowSave', context);
			expect(token.decision).toBe(decision);
			expect(token.policyVersions).toEqual([{ scope: 'instance', version: 7 }]);
		});

		it('returns the advisory decision as-is, violations and all', async () => {
			const decision: PolicyDecision = {
				violations: [violation],
				checkErrors: [{ checkId: 'flaky', correlationId: 'abc' }],
			};
			backend.evaluate.mockResolvedValue(decision);
			const context = { workflow: savedWorkflow, projectId: null };

			expect(await service.evaluateContentImport(context)).toBe(decision);
			expect(backend.evaluate).toHaveBeenCalledWith('contentImport', context);
		});
	});

	describe('subject binding', () => {
		const service = new PolicyEnforcementService();

		it('binds a saved workflow to its id', async () => {
			const token = await service.enforceWorkflowStart({
				workflow: savedWorkflow,
				projectId: null,
			});

			expect(token.subject).toEqual({ type: 'workflow', id: 'wf-1' });
		});

		it('binds an unsaved workflow to a hash of its nodes', async () => {
			const unsaved: PolicedWorkflow = { id: null, name: 'New', nodes: [] };

			const token = await service.enforceWorkflowSave({
				workflow: unsaved,
				storedWorkflow: null,
				projectId: null,
			});

			expect(token.subject.type).toBe('workflow');
			expect(token.subject.id).toMatch(/^[0-9a-f]{64}$/);
		});

		// A create can carry a client-supplied id (POST /workflows allows it), but that id is no
		// proof of what was checked, so the save still binds to the content.
		it('binds a create with a supplied id to a hash of its nodes', async () => {
			const withClientId: PolicedWorkflow = { id: 'wf-client', name: 'New', nodes: [] };

			const token = await service.enforceWorkflowSave({
				workflow: withClientId,
				storedWorkflow: null,
				projectId: null,
			});

			expect(token.subject.id).toMatch(/^[0-9a-f]{64}$/);
			expect(token.subject.id).not.toBe('wf-client');
		});

		it('gives two unsaved workflows with different nodes different subjects', async () => {
			const enforce = async (nodes: PolicedWorkflow['nodes']) =>
				await service.enforceWorkflowSave({
					workflow: { id: null, name: 'New', nodes },
					storedWorkflow: null,
					projectId: null,
				});

			const empty = await enforce([]);
			const withNode = await enforce([mock<PolicedWorkflow['nodes'][number]>({ type: 'slack' })]);

			expect(empty.subject.id).not.toBe(withNode.subject.id);
		});

		it('binds a credential decrypt to the credential', async () => {
			const token = await service.enforceCredentialDecrypt({
				credentialType: 'slackApi',
				credentialId: 'cred-1',
				consumer: { nodeType: 'n8n-nodes-base.slack' },
				projectId: null,
			});

			expect(token.subject).toEqual({ type: 'credential', id: 'cred-1' });
		});
	});
});
