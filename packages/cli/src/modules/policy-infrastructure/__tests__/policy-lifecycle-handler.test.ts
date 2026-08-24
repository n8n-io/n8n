import type {
	PolicyCheckClass,
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowExecuteBeforeContext,
} from '@n8n/decorators';
import { LifecycleMetadata, PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ModulesHooksRegistry } from '@/execution-lifecycle/execution-lifecycle-hooks';
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
	const checkMetadata = mock<PolicyCheckMetadata>();

	const handler = new PolicyLifecycleHandler(
		policyEnforcementService,
		ownershipService,
		checkMetadata,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		checkMetadata.getClasses.mockReturnValue([mock<PolicyCheckClass>()]);
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
		// An unevaluated project-scoped rule is not a passed one, so this must not degrade into
		// enforcing with no project.
		const error = new Error('no shared row');
		ownershipService.getWorkflowProjectCached.mockRejectedValue(error);

		await expect(handler.onWorkflowExecuteBefore(beforeContext())).rejects.toBe(error);

		expect(policyEnforcementService.enforceWorkflowStart).not.toHaveBeenCalled();
	});

	it('does nothing at all when no policy check is registered', async () => {
		// The feature being absent must never fail an execution, so it must not even reach the
		// project lookup, which can throw.
		checkMetadata.getClasses.mockReturnValue([]);

		await handler.onWorkflowExecuteBefore(beforeContext());

		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceWorkflowStart).not.toHaveBeenCalled();
	});

	it('does not enforce when the event carries no workflow instance', async () => {
		// Queue mode fires this on main once the job is enqueued, and the pre-flight-failure
		// recorder fires it for a run that already failed.
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

	describe('through the hook chain', () => {
		const runBeforeHook = async () => {
			const hooks = new ExecutionLifecycleHooks('trigger', 'exec-1', workflow);
			Container.get(ModulesHooksRegistry).addHooks(hooks);

			await hooks.runHook('workflowExecuteBefore', [mock<Workflow>(), undefined]);
		};

		beforeEach(() => {
			// A fresh service each time: `setImplementation` is single-shot.
			const enforcement = new PolicyEnforcementService();
			enforcement.setImplementation(Container.get(PolicyDecisionService));

			const ownership = mock<OwnershipService>();
			ownership.getWorkflowProjectCached.mockResolvedValue(mock({ id: 'proj-1' }));

			// The registry resolves the handler through DI, so the instance it gets has to be
			// the one wired to the real enforcement service. The real metadata registry is used
			// on both sides, so `ConfigurableCheck` below is what makes the handler act.
			Container.set(
				PolicyLifecycleHandler,
				new PolicyLifecycleHandler(enforcement, ownership, Container.get(PolicyCheckMetadata)),
			);

			Container.get(ConfigurableCheck).result = { violations: [] };
		});

		it('lets an always-allowed start through', async () => {
			await expect(runBeforeHook()).resolves.toBeUndefined();
		});

		it('propagates a violation, so nothing in the chain swallows it', async () => {
			Container.get(ConfigurableCheck).result = { violations: [violation] };

			await expect(runBeforeHook()).rejects.toThrow(PolicyViolationError);
		});
	});
});
