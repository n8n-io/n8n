import type { LicenseState, Logger } from '@n8n/backend-common';
import type { ExecutionAdmissionContext } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitPolicyCheck } from '../execution-limit.check';
import type { ExecutionLimitsService } from '../execution-limits.service';
import type { ExecutionUsageService } from '../execution-usage.service';
import { periodRange } from '../execution-usage-period';
import type { ExecutionUsage, UsageScope } from '../execution-usage';

const PERIOD = periodRange('month', new Date('2026-11-15T00:00:00Z'));
const PROJECT_ID = 'project-1';

const usageOf = (scope: UsageScope, executions: number): ExecutionUsage => ({
	scope,
	period: PERIOD,
	executions,
	lastCountedAt: null,
});

const contextOf = (
	overrides: Partial<ExecutionAdmissionContext> = {},
): ExecutionAdmissionContext => ({
	artifact: { kind: 'workflow', id: 'wf-1', name: 'Nightly sync' },
	projectId: PROJECT_ID,
	mode: 'trigger',
	source: null,
	engine: 'v1',
	...overrides,
});

describe('ExecutionLimitPolicyCheck', () => {
	const limitsService = mock<ExecutionLimitsService>();
	const usageService = mock<ExecutionUsageService>();
	const licenseState = mock<LicenseState>();
	const logger = mock<Logger>();
	let check: ExecutionLimitPolicyCheck;

	const setLimits = (projectMaxExecutions: number | null, instanceMaxExecutions: number | null) =>
		limitsService.getApplicableLimits.mockReturnValue({
			periodUnit: 'month',
			projectMaxExecutions,
			instanceMaxExecutions,
		});

	const setUsage = (project: number | null, instance: number | null) =>
		usageService.getCachedUsage.mockImplementation((scope) => {
			const executions = scope.type === 'project' ? project : instance;
			return executions === null ? null : usageOf(scope, executions);
		});

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		check = new ExecutionLimitPolicyCheck(limitsService, usageService, licenseState, logger);
	});

	const run = async (context = contextOf()) =>
		(await check.onExecutionAdmission(context)).violations;

	describe('runs that do not count', () => {
		it.each(['manual', 'error', 'integrated', 'internal', 'chat'] as const)(
			'allows a %s run and reads nothing',
			async (mode) => {
				setLimits(1, 1);
				setUsage(100, 100);

				expect(await run(contextOf({ mode }))).toEqual([]);

				expect(limitsService.getApplicableLimits).not.toHaveBeenCalled();
				expect(usageService.getCachedUsage).not.toHaveBeenCalled();
			},
		);

		it('allows a run that an AI assistant started', async () => {
			setLimits(1, 1);
			setUsage(100, 100);

			expect(await run(contextOf({ source: 'instance_ai' }))).toEqual([]);

			expect(usageService.getCachedUsage).not.toHaveBeenCalled();
		});

		it('counts a webhook run that a user started', async () => {
			setLimits(1, null);
			setUsage(1, null);

			expect(await run(contextOf({ mode: 'webhook', source: 'user' }))).toHaveLength(1);
		});

		it('allows an agent and reads nothing', async () => {
			setLimits(1, 1);
			setUsage(100, 100);

			const context = contextOf({ artifact: { kind: 'agent', id: 'a-1', name: 'Agent' } });

			expect(await run(context)).toEqual([]);
			expect(limitsService.getApplicableLimits).not.toHaveBeenCalled();
			expect(usageService.getCachedUsage).not.toHaveBeenCalled();
		});

		it('allows every run and reads nothing when the licence is off', async () => {
			licenseState.isExecutionLimitsLicensed.mockReturnValue(false);
			setLimits(1, 1);
			setUsage(100, 100);

			expect(await run()).toEqual([]);

			expect(limitsService.getApplicableLimits).not.toHaveBeenCalled();
			expect(usageService.getCachedUsage).not.toHaveBeenCalled();
		});
	});

	describe('limits', () => {
		it('allows a run and reads no usage when no scope has a limit', async () => {
			setLimits(null, null);
			setUsage(100, 100);

			expect(await run()).toEqual([]);

			expect(usageService.getCachedUsage).not.toHaveBeenCalled();
		});

		it.each([
			{ usage: 9, count: 0 },
			{ usage: 10, count: 1 },
			{ usage: 11, count: 1 },
		])(
			'with a project limit only, usage $usage gives $count violations',
			async ({ usage, count }) => {
				setLimits(10, null);
				setUsage(usage, null);

				const violations = await run();

				expect(violations).toHaveLength(count);
				expect(usageService.getCachedUsage).toHaveBeenCalledExactlyOnceWith({
					type: 'project',
					projectId: PROJECT_ID,
				});
			},
		);

		it.each([
			{ usage: 49, count: 0 },
			{ usage: 50, count: 1 },
			{ usage: 51, count: 1 },
		])(
			'with an instance limit only, usage $usage gives $count violations',
			async ({ usage, count }) => {
				setLimits(null, 50);
				setUsage(null, usage);

				const violations = await run();

				expect(violations).toHaveLength(count);
				expect(usageService.getCachedUsage).toHaveBeenCalledExactlyOnceWith({ type: 'instance' });
			},
		);

		it('allows a run when neither of two limits is reached', async () => {
			setLimits(10, 50);
			setUsage(9, 49);

			expect(await run()).toEqual([]);
		});

		it('refuses with the project scope when only the project limit is reached', async () => {
			setLimits(10, 50);
			setUsage(10, 49);

			const violations = await run();

			expect(violations.map(({ scope }) => scope)).toEqual(['project']);
		});

		it('refuses with the instance scope when only the instance limit is reached', async () => {
			setLimits(10, 50);
			setUsage(9, 50);

			const violations = await run();

			expect(violations.map(({ scope }) => scope)).toEqual(['instance']);
		});

		it('gives the project violation first when both limits are reached', async () => {
			setLimits(10, 50);
			setUsage(10, 50);

			const violations = await run();

			expect(violations.map(({ scope }) => scope)).toEqual(['project', 'instance']);
		});

		it('reads only the instance scope and omits projectId for a run with no project', async () => {
			setLimits(null, 50);
			setUsage(null, 50);

			const violations = await run(contextOf({ projectId: null }));

			expect(violations).toHaveLength(1);
			expect(violations[0]).not.toHaveProperty('projectId');
			expect(usageService.getCachedUsage).toHaveBeenCalledExactlyOnceWith({ type: 'instance' });
			expect(limitsService.getApplicableLimits).toHaveBeenCalledWith(null);
		});

		it('describes a reached project limit in full', async () => {
			setLimits(10, null);
			setUsage(12, null);

			expect(await run()).toEqual([
				{
					kind: 'execution-limit',
					checkId: 'execution-limit',
					message: expect.stringContaining('12 of 10'),
					scope: 'project',
					projectId: PROJECT_ID,
					limit: 10,
					usage: 12,
					resetsAt: PERIOD.resetsAt.toISOString(),
				},
			]);
		});

		it('keeps the project id on an instance violation', async () => {
			setLimits(null, 50);
			setUsage(null, 50);

			const [violation] = await run();

			expect(violation).toMatchObject({ scope: 'instance', projectId: PROJECT_ID });
		});
	});

	describe('when the check cannot decide', () => {
		it('allows the run and warns when the limits are not loaded', async () => {
			limitsService.getApplicableLimits.mockReturnValue(null);

			expect(await run()).toEqual([]);

			expect(logger.warn).toHaveBeenCalledOnce();
			expect(usageService.getCachedUsage).not.toHaveBeenCalled();
		});

		it('allows the scope with unknown usage, warns, and lets the other scope decide', async () => {
			setLimits(10, 50);
			setUsage(null, 50);

			const violations = await run();

			expect(violations.map(({ scope }) => scope)).toEqual(['instance']);
			expect(logger.warn).toHaveBeenCalledOnce();
		});

		it('warns on the first unknown usage and not on the second', async () => {
			setLimits(10, null);
			setUsage(null, null);

			await run();
			await run();

			expect(logger.warn).toHaveBeenCalledOnce();
		});

		it('warns again after 100 allowed runs', async () => {
			setLimits(10, null);
			setUsage(null, null);

			for (let i = 0; i < 101; i++) await run();

			expect(logger.warn).toHaveBeenCalledTimes(2);
		});

		it('allows the run and logs an error when the limits service throws', async () => {
			limitsService.getApplicableLimits.mockImplementation(() => {
				throw new Error('boom');
			});

			expect(await run()).toEqual([]);

			expect(logger.error).toHaveBeenCalledOnce();
		});

		it('allows the run and logs an error when the usage service throws', async () => {
			setLimits(10, 50);
			usageService.getCachedUsage.mockImplementation(() => {
				throw new Error('boom');
			});

			expect(await run()).toEqual([]);

			expect(logger.error).toHaveBeenCalledOnce();
		});
	});
});
