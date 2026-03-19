import type { InstanceAiPlanSpec } from '@n8n/api-types';

import { derivePlanStatus, reconcilePlanPhases, shouldAutoContinuePlan } from '../plan-utils';

function makePlan(overrides: Partial<InstanceAiPlanSpec> = {}): InstanceAiPlanSpec {
	return {
		planId: 'plan_123',
		goal: 'Build workflows',
		summary: 'Plan summary',
		assumptions: [],
		externalSystems: [],
		dataContracts: [],
		acceptanceCriteria: [],
		openQuestions: [],
		status: 'approved',
		phases: [
			{
				id: 'phase-1',
				title: 'Phase 1',
				description: 'Create table',
				objective: 'Persist records',
				dependsOn: [],
				inputs: [],
				deliverable: 'Data table',
				verification: {
					mode: 'resource-check',
					successCriteria: 'Table exists',
					expectedOutcome: 'Table ready',
				},
				blockingQuestions: [],
				status: 'done',
				artifacts: [],
				verificationAttempts: 0,
			},
			{
				id: 'phase-2',
				title: 'Phase 2',
				description: 'Build workflow',
				objective: 'Create workflow',
				dependsOn: ['phase-1'],
				inputs: [],
				deliverable: 'Workflow',
				verification: {
					mode: 'run-workflow',
					successCriteria: 'Workflow succeeds',
					expectedOutcome: 'Workflow verified',
				},
				blockingQuestions: [],
				status: 'pending',
				artifacts: [],
				verificationAttempts: 0,
			},
		],
		...overrides,
	};
}

describe('plan utils', () => {
	it('promotes pending phases to ready once dependencies are done', () => {
		const plan = makePlan();

		const reconciled = reconcilePlanPhases(plan);

		expect(reconciled.phases[1].status).toBe('ready');
	});

	it('fails dependent phases when an upstream dependency failed', () => {
		const plan = makePlan({
			phases: [
				{
					...makePlan().phases[0],
					status: 'failed',
					lastVerificationError: 'Timeout',
					lastVerificationFailureSignature: 'timeout',
				},
				makePlan().phases[1],
			],
		});

		const reconciled = reconcilePlanPhases(plan);

		expect(reconciled.phases[1].status).toBe('failed');
		expect(reconciled.phases[1].lastVerificationFailureSignature).toBe('dependency_failed:phase-1');
	});

	it('treats plans with only done and failed phases as completed', () => {
		const plan = makePlan({
			status: 'running',
			phases: [
				makePlan().phases[0],
				{
					...makePlan().phases[1],
					status: 'failed',
					lastVerificationError: 'Still failing',
				},
			],
		});

		expect(derivePlanStatus(plan, 'running')).toBe('completed');
	});

	it('auto-continues approved plans with runnable phases', () => {
		const plan = makePlan({
			phases: [
				{
					...makePlan().phases[0],
					status: 'ready',
				},
			],
		});

		expect(shouldAutoContinuePlan(plan)).toBe(true);
	});

	it('does not auto-continue blocked plans', () => {
		const plan = makePlan({
			status: 'blocked',
			phases: [
				{
					...makePlan().phases[0],
					status: 'blocked',
					blocker: { reason: 'Need API key', inputType: 'text' },
				},
			],
		});

		expect(shouldAutoContinuePlan(plan)).toBe(false);
	});
});
