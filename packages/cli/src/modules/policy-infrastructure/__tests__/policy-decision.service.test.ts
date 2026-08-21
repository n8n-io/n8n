import { mockLogger } from '@n8n/backend-test-utils';
import type {
	PolicyCheckClass,
	PolicyCheckMetadata,
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowSaveContext,
	WorkflowStartContext,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { classifyHttpError } from '@/errors/http-error-classifier';
import { serializeInternalRestError } from '@/errors/http-error-serializers';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import { PolicyCheckFailedError } from '../policy-check-failed.error';
import { PolicyDecisionService, withDeadline } from '../policy-decision.service';

const slackBlocked = {
	kind: 'node-type-unavailable',
	checkId: 'node-types',
	message: 'n8n-nodes-base.slack is not available',
};

const codeBlocked = {
	kind: 'node-type-unavailable',
	checkId: 'other',
	message: 'n8n-nodes-base.code is not available',
};

const saveContext: WorkflowSaveContext = {
	workflow: { id: 'wf-1', name: 'My workflow', nodes: [] },
	storedWorkflow: null,
	projectId: 'proj-1',
};

const startContext: WorkflowStartContext = {
	workflow: { id: 'wf-1', name: 'My workflow', nodes: [] },
	projectId: 'proj-1',
};

@Service()
class SilentCheck implements RegisteredPolicyCheck {
	readonly id = 'silent';

	async onWorkflowSave(): Promise<PolicyCheckResult> {
		return { violations: [] };
	}
}

@Service()
class SlackCheck implements RegisteredPolicyCheck {
	readonly id = 'node-types';

	async onWorkflowSave(): Promise<PolicyCheckResult> {
		return { violations: [slackBlocked], policyVersions: [{ scope: 'instance', version: 4 }] };
	}
}

@Service()
class CodeCheck implements RegisteredPolicyCheck {
	readonly id = 'other';

	async onWorkflowSave(): Promise<PolicyCheckResult> {
		return { violations: [codeBlocked], policyVersions: [{ scope: 'instance', version: 4 }] };
	}
}

@Service()
class BrokenCheck implements RegisteredPolicyCheck {
	readonly id = 'broken';

	async onWorkflowSave(): Promise<PolicyCheckResult> {
		throw new Error('the policy store connection dropped');
	}
}

@Service()
class HangingCheck implements RegisteredPolicyCheck {
	readonly id = 'hanging';

	async onWorkflowStart(): Promise<PolicyCheckResult> {
		return await new Promise(() => {});
	}
}

/** Honours the signal, the way a check talking to a store with an abortable client would. */
@Service()
class AbortAwareCheck implements RegisteredPolicyCheck {
	readonly id = 'abort-aware';

	aborted: unknown = null;

	async onWorkflowStart(
		_ctx: WorkflowStartContext,
		signal: AbortSignal,
	): Promise<PolicyCheckResult> {
		return await new Promise((_resolve, reject) => {
			signal.addEventListener('abort', () => {
				this.aborted = signal.reason;
				reject(new Error('aborted by signal'));
			});
		});
	}
}

/** Only implements `onWorkflowStart`, so it must not be called at other points. */
@Service()
class StartOnlyCheck implements RegisteredPolicyCheck {
	readonly id = 'start-only';

	onWorkflowStart = vi.fn(async (): Promise<PolicyCheckResult> => ({ violations: [] }));
}

const serviceWith = (...classes: PolicyCheckClass[]) => {
	const metadata = mock<PolicyCheckMetadata>({ getClasses: () => classes });

	return new PolicyDecisionService(mockLogger(), metadata);
};

describe('PolicyDecisionService', () => {
	describe('enforce', () => {
		it('allows when no checks are registered', async () => {
			const decision = await serviceWith().enforce('workflowSave', saveContext);

			expect(decision).toEqual({ violations: [] });
		});

		it('allows when every registered check is silent', async () => {
			const decision = await serviceWith(SilentCheck).enforce('workflowSave', saveContext);

			expect(decision).toEqual({ violations: [] });
		});

		it('reports every violation, not just the first', async () => {
			const decision = await serviceWith(SlackCheck, CodeCheck).enforce(
				'workflowSave',
				saveContext,
			);

			expect(decision.violations).toEqual([slackBlocked, codeBlocked]);
		});

		it('merges the policy versions the checks read, without duplicates', async () => {
			const decision = await serviceWith(SlackCheck, CodeCheck).enforce(
				'workflowSave',
				saveContext,
			);

			expect(decision.policyVersions).toEqual([{ scope: 'instance', version: 4 }]);
		});

		it('blocks when a check throws, without leaking why', async () => {
			const error = await serviceWith(SilentCheck, BrokenCheck)
				.enforce('workflowSave', saveContext)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyCheckFailedError);
			const failure = error as PolicyCheckFailedError;
			expect(failure.message).not.toContain('policy store');
			expect(JSON.stringify(failure.meta)).not.toContain('policy store');
			expect(failure.meta.correlationIds).toHaveLength(1);
			expect(failure.httpStatusCode).toBe(503);
		});

		it('treats a check that overruns its deadline like one that threw', async () => {
			vi.useFakeTimers();

			try {
				const pending = serviceWith(HangingCheck)
					.enforce('workflowStart', startContext)
					.catch((e: unknown) => e);

				await vi.advanceTimersByTimeAsync(250);

				expect(await pending).toBeInstanceOf(PolicyCheckFailedError);
			} finally {
				vi.useRealTimers();
			}
		});

		it('signals a check that overruns, so it can stop its own work', async () => {
			vi.useFakeTimers();

			try {
				const pending = serviceWith(AbortAwareCheck)
					.enforce('workflowStart', startContext)
					.catch((e: unknown) => e);

				await vi.advanceTimersByTimeAsync(250);

				expect(await pending).toBeInstanceOf(PolicyCheckFailedError);
				expect(Container.get(AbortAwareCheck).aborted).toBeInstanceOf(OperationalError);
			} finally {
				vi.useRealTimers();
			}
		});

		it('only runs checks that implement the point', async () => {
			const service = serviceWith(StartOnlyCheck);

			await service.enforce('workflowSave', saveContext);

			expect(Container.get(StartOnlyCheck).onWorkflowStart).not.toHaveBeenCalled();
		});
	});

	describe('evaluate', () => {
		it('returns an empty decision when no checks are registered', async () => {
			expect(await serviceWith().evaluate('workflowSave', saveContext)).toEqual({
				violations: [],
			});
		});

		it('returns violations rather than throwing', async () => {
			const decision = await serviceWith(SlackCheck).evaluate('workflowSave', saveContext);

			expect(decision.violations).toEqual([slackBlocked]);
			expect(decision.checkErrors).toBeUndefined();
		});

		it('keeps the surviving checks when one breaks', async () => {
			const decision = await serviceWith(SlackCheck, BrokenCheck).evaluate(
				'workflowSave',
				saveContext,
			);

			expect(decision.violations).toEqual([slackBlocked]);
			expect(decision.checkErrors).toHaveLength(1);
			expect(decision.checkErrors?.[0].checkId).toBe('broken');
			expect(decision.checkErrors?.[0].correlationId).toMatch(/^[0-9a-f-]{36}$/);
		});
	});

	describe('check resolution', () => {
		it('reads the registry per decision, so a check registered later still runs', async () => {
			const classes: PolicyCheckClass[] = [];
			const metadata = mock<PolicyCheckMetadata>({ getClasses: () => classes });
			const service = new PolicyDecisionService(mockLogger(), metadata);

			expect(await service.enforce('workflowSave', saveContext)).toEqual({ violations: [] });

			classes.push(SlackCheck);

			const decision = await service.enforce('workflowSave', saveContext);
			expect(decision.violations).toEqual([slackBlocked]);
		});
	});

	describe('through the enforcement proxy', () => {
		it('turns violations into a PolicyViolationError', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(SlackCheck));

			const error = await proxy.enforceWorkflowSave(saveContext).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyViolationError);
			expect((error as PolicyViolationError).violations).toEqual([slackBlocked]);
		});

		it('clears when the checks are silent', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(SilentCheck));

			const token = await proxy.enforceWorkflowSave(saveContext);

			expect(token.subject).toEqual({ type: 'workflow', id: 'wf-1' });
		});

		it('lets a check failure through as-is, so the action is blocked', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(BrokenCheck));

			await expect(proxy.enforceWorkflowSave(saveContext)).rejects.toBeInstanceOf(
				PolicyCheckFailedError,
			);
		});

		it('keeps the check failure out of the REST response body', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(BrokenCheck));

			const error = await proxy.enforceWorkflowSave(saveContext).catch((e: unknown) => e);
			const { status, body } = serializeInternalRestError(classifyHttpError(error as Error));

			expect(status).toBe(503);
			expect(JSON.stringify(body)).not.toContain('policy store');
			expect(body.meta).toEqual({ correlationIds: [expect.any(String)] });
		});
	});
});

describe('withDeadline', () => {
	const afterDeadline = async (work: (signal: AbortSignal) => Promise<unknown>) => {
		vi.useFakeTimers();

		try {
			const pending = withDeadline(work, 250).catch((e: unknown) => e);
			await vi.advanceTimersByTimeAsync(250);

			return await pending;
		} finally {
			vi.useRealTimers();
		}
	};

	it('rejects when a check resolves from its abort handler', async () => {
		const resolvesOnAbort = async (signal: AbortSignal) =>
			await new Promise((resolve) => signal.addEventListener('abort', () => resolve('too late')));

		expect(await afterDeadline(resolvesOnAbort)).toBeInstanceOf(OperationalError);
	});

	it('rejects when a check ignores the signal entirely', async () => {
		const ignoresSignal = async () => await new Promise(() => {});

		expect(await afterDeadline(ignoresSignal)).toBeInstanceOf(OperationalError);
	});

	it('returns the answer when the check beats the deadline', async () => {
		expect(await withDeadline(async () => 'in time', 250)).toBe('in time');
	});
});
