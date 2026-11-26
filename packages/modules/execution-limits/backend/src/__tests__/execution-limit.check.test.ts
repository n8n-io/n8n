import type { LicenseState, Logger } from '@n8n/backend-common';
import type { ExecutionAdmissionContext } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitPolicyCheck } from '../execution-limit.check';
import type { ExecutionLimitsService } from '../execution-limits.service';
import type { ExecutionUsageService } from '../execution-usage.service';
import { periodRange } from '../execution-usage-period';

const PERIOD = periodRange('month', new Date('2026-11-15T00:00:00Z'));
const PROJECT_ID = 'project-1';

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
			return executions === null
				? null
				: { scope, period: PERIOD, executions, lastCountedAt: null };
		});

	const run = async (context = contextOf()) =>
		(await check.onExecutionAdmission(context)).violations;

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		check = new ExecutionLimitPolicyCheck(limitsService, usageService, licenseState, logger);
		setLimits(1, 1);
		setUsage(100, 100);
	});

	it.each([
		['a manual run', contextOf({ mode: 'manual' })],
		['a run the AI assistant started', contextOf({ source: 'instance_ai' })],
		['an agent run', contextOf({ artifact: { kind: 'agent', id: 'agent-1', name: 'Helper' } })],
	])('allows %s and reads nothing', async (_, context) => {
		expect(await run(context)).toEqual([]);

		expect(limitsService.getApplicableLimits).not.toHaveBeenCalled();
		expect(usageService.getCachedUsage).not.toHaveBeenCalled();
	});

	it('allows every run and reads nothing when the licence is off', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);

		expect(await run()).toEqual([]);

		expect(limitsService.getApplicableLimits).not.toHaveBeenCalled();
	});

	it.each([
		{ limits: [null, null], usage: [100, 100], refused: [] },
		{ limits: [10, null], usage: [9, null], refused: [] },
		{ limits: [10, null], usage: [10, null], refused: ['project'] },
		{ limits: [null, 50], usage: [null, 50], refused: ['instance'] },
		{ limits: [10, 50], usage: [9, 49], refused: [] },
		{ limits: [10, 50], usage: [10, 49], refused: ['project'] },
		{ limits: [10, 50], usage: [9, 50], refused: ['instance'] },
		{ limits: [10, 50], usage: [10, 50], refused: ['project', 'instance'] },
	] as const)(
		'with limits $limits and usage $usage refuses for $refused',
		async ({ limits, usage, refused }) => {
			setLimits(limits[0], limits[1]);
			setUsage(usage[0], usage[1]);

			expect((await run()).map(({ scope }) => scope)).toEqual(refused);
		},
	);

	it('describes each reached limit in full', async () => {
		setLimits(10, 50);
		setUsage(12, 50);
		const common = {
			kind: 'execution-limit',
			checkId: 'execution-limit',
			projectId: PROJECT_ID,
			resetsAt: PERIOD.resetsAt.toISOString(),
		};

		expect(await run()).toEqual([
			{
				...common,
				message: expect.stringContaining('12 of 10'),
				scope: 'project',
				limit: 10,
				usage: 12,
			},
			{
				...common,
				message: expect.stringContaining('50 of 50'),
				scope: 'instance',
				limit: 50,
				usage: 50,
			},
		]);
	});

	it('checks only the instance limit for a run with no project', async () => {
		setLimits(null, 50);
		setUsage(null, 50);

		const violations = await run(contextOf({ projectId: null }));

		expect(violations).toHaveLength(1);
		expect(violations[0]).not.toHaveProperty('projectId');
		expect(usageService.getCachedUsage).toHaveBeenCalledExactlyOnceWith({ type: 'instance' });
	});

	describe('fails open', () => {
		it('allows the run and warns when the limits are not loaded', async () => {
			limitsService.getApplicableLimits.mockReturnValue(null);

			expect(await run()).toEqual([]);

			expect(logger.warn).toHaveBeenCalledOnce();
		});

		it('lets the other scope decide when one usage is not loaded', async () => {
			setLimits(10, 50);
			setUsage(null, 50);

			expect((await run()).map(({ scope }) => scope)).toEqual(['instance']);
			expect(logger.warn).toHaveBeenCalledOnce();
		});

		it('warns once every 100 runs it cannot decide', async () => {
			setLimits(10, null);
			setUsage(null, null);

			for (let i = 0; i < 101; i++) await run();

			expect(logger.warn).toHaveBeenCalledTimes(2);
		});

		it('allows the run and logs an error when a read throws', async () => {
			usageService.getCachedUsage.mockImplementation(() => {
				throw new Error('boom');
			});

			expect(await run()).toEqual([]);

			expect(logger.error).toHaveBeenCalledOnce();
		});
	});
});
