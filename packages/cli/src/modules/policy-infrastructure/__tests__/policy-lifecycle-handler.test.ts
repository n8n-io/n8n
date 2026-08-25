import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowExecuteBeforeContext,
} from '@n8n/decorators';
import { LifecycleMetadata, PolicyCheck } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { OwnershipService } from '@/services/ownership.service';

import { PolicyCheckFailedError } from '../policy-check-failed.error';
import { PolicyDecisionService } from '../policy-decision.service';
import { PolicyLifecycleHandler } from '../policy-lifecycle-handler';

const violation = {
	kind: 'node-type-unavailable',
	checkId: 'node-types',
	message: 'n8n-nodes-base.slack is not available',
};

const workflow = mock<IWorkflowBase>({
	id: 'wf-1',
	name: 'My workflow',
	nodes: [],
});

const beforeContext = (
	overrides: Partial<WorkflowExecuteBeforeContext> = {},
): WorkflowExecuteBeforeContext => ({
	type: 'workflowExecuteBefore',
	workflow,
	mode: 'trigger',
	workflowInstance: mock<Workflow>(),
	executionId: 'exec-1',
	...overrides,
});

describe('PolicyLifecycleHandler', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const ownershipService = mock<OwnershipService>();

	const handler = new PolicyLifecycleHandler(policyEnforcementService, ownershipService);

	beforeEach(() => {
		vi.clearAllMocks();
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(mock({ id: 'proj-1' }));
		policyEnforcementService.enforceWorkflowStart.mockResolvedValue(mock());
	});

	it('enforces the workflow start point with the workflow and its owning project', async () => {
		await handler.onWorkflowExecuteBefore(beforeContext());

		expect(policyEnforcementService.enforceWorkflowStart).toHaveBeenCalledExactlyOnceWith({
			workflow,
			projectId: 'proj-1',
		});
	});

	it('lets the execution proceed when the checks clear', async () => {
		await expect(handler.onWorkflowExecuteBefore(beforeContext())).resolves.toBeUndefined();
	});

	it('propagates a policy violation instead of swallowing it', async () => {
		const error = new PolicyViolationError([violation]);
		policyEnforcementService.enforceWorkflowStart.mockRejectedValue(error);

		await expect(handler.onWorkflowExecuteBefore(beforeContext())).rejects.toBe(error);
	});

	it('propagates a check that failed to run', async () => {
		const error = new PolicyCheckFailedError('workflowStart', ['corr-1']);
		policyEnforcementService.enforceWorkflowStart.mockRejectedValue(error);

		await expect(handler.onWorkflowExecuteBefore(beforeContext())).rejects.toBe(error);
	});

	it('blocks the run when the owning project cannot be resolved', async () => {
		const error = new Error('no shared row');
		ownershipService.getWorkflowProjectCached.mockRejectedValue(error);

		await expect(handler.onWorkflowExecuteBefore(beforeContext())).rejects.toBe(error);

		expect(policyEnforcementService.enforceWorkflowStart).not.toHaveBeenCalled();
	});

	it('does nothing at all when no check guards the workflow start point', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		await handler.onWorkflowExecuteBefore(beforeContext());

		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceWorkflowStart).not.toHaveBeenCalled();
	});

	it('asks about the workflow start point specifically', async () => {
		// So a check registered only for another point can't drag this one into a lookup.
		await handler.onWorkflowExecuteBefore(beforeContext());

		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledExactlyOnceWith('workflowStart');
	});

	it('does not enforce when the event carries no workflow instance', async () => {
		await handler.onWorkflowExecuteBefore(beforeContext({ workflowInstance: undefined }));

		expect(policyEnforcementService.enforceWorkflowStart).not.toHaveBeenCalled();
		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
	});
});

/** Stands in for a real check; the only one registered in this suite. */
@PolicyCheck()
class ConfigurableCheck implements RegisteredPolicyCheck {
	readonly id = 'configurable';

	result: PolicyCheckResult = { violations: [] };

	async onWorkflowStart(): Promise<PolicyCheckResult> {
		return this.result;
	}
}

describe('workflowExecuteBefore wiring', () => {
	it('registers the handler for the workflowExecuteBefore lifecycle event', () => {
		expect(Container.get(LifecycleMetadata).getHandlers()).toContainEqual({
			handlerClass: PolicyLifecycleHandler,
			methodName: 'onWorkflowExecuteBefore',
			eventName: 'workflowExecuteBefore',
		});
	});

	// That a throw survives the hook chain is covered where the chain lives, in
	// `execution-lifecycle/__tests__/execution-lifecycle-hooks.test.ts`.
	describe('against the real decision service', () => {
		const ownership = mock<OwnershipService>();

		const handler = () => {
			// A fresh service each time: `setImplementation` is single-shot.
			const enforcement = new PolicyEnforcementService();
			enforcement.setImplementation(Container.get(PolicyDecisionService));

			return new PolicyLifecycleHandler(enforcement, ownership);
		};

		beforeEach(() => {
			ownership.getWorkflowProjectCached.mockResolvedValue(mock({ id: 'proj-1' }));
			Container.get(ConfigurableCheck).result = { violations: [] };
		});

		it('lets an always-allowed start through', async () => {
			await expect(handler().onWorkflowExecuteBefore(beforeContext())).resolves.toBeUndefined();
		});

		it('throws a PolicyViolationError when a check reports one', async () => {
			Container.get(ConfigurableCheck).result = { violations: [violation] };

			await expect(handler().onWorkflowExecuteBefore(beforeContext())).rejects.toThrow(
				PolicyViolationError,
			);
		});
	});
});
