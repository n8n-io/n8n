import { mockLogger } from '@n8n/backend-test-utils';
import {
	type CredentialDecryptContext,
	type PolicyCheckClass,
	type PolicyCheckMetadata,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
	type WorkflowSaveContext,
	type WorkflowStartContext,
	type WorkflowTransferContext,
	workflowContentSubject,
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
	subject: 'n8n-nodes-base.slack',
	subjectType: 'nodeType',
	scope: 'instance',
	matchedRuleId: 'rule-7',
};

/** `slackBlocked` as the audit line records it — no `message`. */
const slackAudited = {
	kind: 'node-type-unavailable',
	checkId: 'node-types',
	subject: 'n8n-nodes-base.slack',
	subjectType: 'nodeType',
	scope: 'instance',
	matchedRuleId: 'rule-7',
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

const createContext: WorkflowSaveContext = {
	workflow: { id: null, name: 'Untitled workflow', nodes: [] },
	storedWorkflow: null,
	projectId: 'proj-1',
};

const transferContext: WorkflowTransferContext = {
	workflow: { id: 'wf-1', name: 'My workflow', nodes: [] },
	targetProjectId: 'proj-2',
};

const decryptContext: CredentialDecryptContext = {
	credentialType: 'slackApi',
	credentialId: 'cred-1',
	consumer: { nodeType: 'n8n-nodes-base.slack' },
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

/** Objects at the two points whose context is not a plain `{ workflow, projectId }`. */
@Service()
class OtherPointsCheck implements RegisteredPolicyCheck {
	readonly id = 'other-points';

	async onWorkflowTransfer(): Promise<PolicyCheckResult> {
		return { violations: [slackBlocked] };
	}

	async onCredentialDecrypt(): Promise<PolicyCheckResult> {
		return { violations: [slackBlocked] };
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

/**
 * The service logs through the return value of `scoped()`, not the injected mock. `mockLogger`
 * hands back the same inner mock every call, so `audit` is the object the service writes to.
 */
const auditedServiceWith = (...classes: PolicyCheckClass[]) => {
	const logger = mockLogger();
	const metadata = mock<PolicyCheckMetadata>({ getClasses: () => classes });

	return {
		service: new PolicyDecisionService(logger, metadata),
		audit: vi.mocked(logger.scoped('policy').warn),
	};
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

	describe('hasChecksFor', () => {
		it('is false when nothing is registered', () => {
			expect(serviceWith().hasChecksFor('workflowStart')).toBe(false);
		});

		it('is true for a point a registered check implements', () => {
			expect(serviceWith(StartOnlyCheck).hasChecksFor('workflowStart')).toBe(true);
		});

		it('is false for a point no registered check implements', () => {
			expect(serviceWith(SilentCheck).hasChecksFor('workflowStart')).toBe(false);
		});

		it('agrees with what enforce would run', async () => {
			const service = serviceWith(SilentCheck);

			expect(service.hasChecksFor('workflowSave')).toBe(true);
			expect((await service.enforce('workflowSave', saveContext)).violations).toEqual([]);
			expect(service.hasChecksFor('workflowStart')).toBe(false);
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

	describe('decision audit line', () => {
		it('writes one line naming the point, the objecting check and the violation', async () => {
			const { service, audit } = auditedServiceWith(SlackCheck);

			await service.enforce('workflowSave', saveContext);

			expect(audit).toHaveBeenCalledTimes(1);
			expect(audit).toHaveBeenCalledWith('Policy blocked workflowSave', {
				point: 'workflowSave',
				outcome: 'violation',
				durationMs: expect.any(Number),
				checkIds: ['node-types'],
				violations: [slackAudited],
				policyVersions: [{ scope: 'instance', version: 4 }],
				workflowId: 'wf-1',
				workflowName: 'My workflow',
				projectId: 'proj-1',
			});
		});

		it('keeps the violation message out of the line', async () => {
			const { service, audit } = auditedServiceWith(SlackCheck);

			await service.enforce('workflowSave', saveContext);

			expect(JSON.stringify(audit.mock.calls[0][1])).not.toContain('is not available');
		});

		it('writes one line for the decision, not one per objecting check', async () => {
			const { service, audit } = auditedServiceWith(SilentCheck, SlackCheck, CodeCheck);

			await service.enforce('workflowSave', saveContext);

			expect(audit).toHaveBeenCalledTimes(1);
			expect(audit.mock.calls[0][1]).toMatchObject({
				checkIds: ['silent', 'node-types', 'other'],
				violations: [slackAudited, { checkId: 'other' }],
			});
		});

		it('names the workflow when a create has no id to name', async () => {
			const { service, audit } = auditedServiceWith(SlackCheck);

			await service.enforce('workflowSave', createContext);

			expect(audit.mock.calls[0][1]).toMatchObject({
				workflowId: null,
				workflowName: 'Untitled workflow',
			});
		});

		it('records the project a transfer moves into', async () => {
			const { service, audit } = auditedServiceWith(OtherPointsCheck);

			await service.enforce('workflowTransfer', transferContext);

			expect(audit.mock.calls[0][1]).toMatchObject({ projectId: 'proj-2' });
		});

		it('records the credential and the node asking for it', async () => {
			const { service, audit } = auditedServiceWith(OtherPointsCheck);

			await service.enforce('credentialDecrypt', decryptContext);

			expect(audit.mock.calls[0][1]).toMatchObject({
				credentialId: 'cred-1',
				credentialType: 'slackApi',
				consumerNodeType: 'n8n-nodes-base.slack',
				projectId: 'proj-1',
			});
			expect(audit.mock.calls[0][1]).not.toHaveProperty('workflowId');
		});

		it('writes a line when a check failure blocks, tied to the check error logs', async () => {
			const { service, audit } = auditedServiceWith(SilentCheck, BrokenCheck);

			const error = (await service
				.enforce('workflowSave', saveContext)
				.catch((e: unknown) => e)) as PolicyCheckFailedError;

			expect(audit).toHaveBeenCalledTimes(1);
			expect(audit).toHaveBeenCalledWith(
				'Policy could not be verified for workflowSave, so it was blocked',
				expect.objectContaining({
					outcome: 'checkFailure',
					checkIds: ['silent', 'broken'],
					violations: [],
					correlationIds: error.meta.correlationIds,
				}),
			);
		});

		it('stays silent when every check is silent', async () => {
			const { service, audit } = auditedServiceWith(SilentCheck);

			await service.enforce('workflowSave', saveContext);

			expect(audit).not.toHaveBeenCalled();
		});

		it('stays silent when no check is registered', async () => {
			const { service, audit } = auditedServiceWith();

			await service.enforce('workflowSave', saveContext);

			expect(audit).not.toHaveBeenCalled();
		});

		it('stays silent for an evaluate that finds violations', async () => {
			const { service, audit } = auditedServiceWith(SlackCheck);

			const decision = await service.evaluate('workflowSave', saveContext);

			expect(decision.violations).toEqual([slackBlocked]);
			expect(audit).not.toHaveBeenCalled();
		});

		it('stays silent for an evaluate that hits a broken check', async () => {
			const { service, audit } = auditedServiceWith(BrokenCheck);

			await service.evaluate('workflowSave', saveContext);

			expect(audit).not.toHaveBeenCalled();
		});

		it('writes the line when the proxy vetoes a save', async () => {
			const { service, audit } = auditedServiceWith(SlackCheck);
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(service);

			await expect(proxy.enforceWorkflowSave(saveContext)).rejects.toBeInstanceOf(
				PolicyViolationError,
			);
			expect(audit).toHaveBeenCalledTimes(1);
			expect(audit).toHaveBeenCalledWith(
				'Policy blocked workflowSave',
				expect.objectContaining({ violations: [slackAudited] }),
			);
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

		it('clears a create against its content, not the client id', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(SilentCheck));

			const token = await proxy.enforceWorkflowSave(saveContext);

			expect(token.subject).toEqual(workflowContentSubject(saveContext.workflow));
			expect(token.subject.id).not.toBe('wf-1');
		});

		it('clears an update against the stored row id', async () => {
			const proxy = new PolicyEnforcementService();
			proxy.setImplementation(serviceWith(SilentCheck));

			const token = await proxy.enforceWorkflowSave({
				...saveContext,
				storedWorkflow: saveContext.workflow,
			});

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
