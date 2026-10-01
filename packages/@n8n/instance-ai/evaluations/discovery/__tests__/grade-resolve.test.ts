import type { GradedCase, GradedTrial } from '../../routing/grade-report';
import { computeScopeMetrics } from '../../routing/grade-report';
import {
	isSameDirectionClarify,
	resolveTrial,
	type RouteResolution,
	staleStopCall,
	strictTrialPasses,
	trialPasses,
} from '../../routing/grade-resolve';
import type { Bucket, RoutingCase, TrialResult, TrialToolCall } from '../../routing/grade-types';

function routingCase(bucket: Bucket, accepts: RoutingCase['accepts']): RoutingCase {
	return {
		id: `case-${bucket}`,
		bucket,
		userMessage: 'Do the thing.',
		accepts,
		policyDependent: false,
	};
}

function call(toolName: string, args: Record<string, unknown> = {}): TrialToolCall {
	return { toolName, args };
}

function trial(toolCalls: TrialToolCall[], overrides: Partial<TrialResult> = {}): TrialResult {
	return {
		trial: 1,
		streamStatus: 'completed',
		toolCalls,
		spawnedAgents: [],
		skillsLoaded: [],
		askUserQuestions: [],
		finalText: 'Here is what I found.',
		...overrides,
	};
}

function resolvedRoute(calls: TrialToolCall[]) {
	const pending = resolveTrial(routingCase('workflow', ['workflow']), trial(calls));
	return pending.kind === 'resolved'
		? { kind: pending.kind, route: pending.resolution.route, rule: pending.resolution.rule }
		: { kind: pending.kind, rule: pending.rule };
}

const clarify = (steer: RouteResolution['steer']): RouteResolution => ({
	route: 'clarify',
	steer,
	rule: 6,
	evidence: 'ask-user',
});

describe('resolveTrial', () => {
	it('looks past data-table schema setup to the build that follows', () => {
		expect(
			resolvedRoute([
				call('data-tables', { action: 'create' }),
				call('build-workflow', { executionIntent: 'recurring' }),
			]),
		).toEqual({ kind: 'resolved', route: 'workflow', rule: 2 });
	});

	it('does not route data-table schema setup alone to one-off', () => {
		expect(resolvedRoute([call('data-tables', { action: 'create' })])).toEqual({
			kind: 'judge',
			rule: 7,
		});
	});

	it('routes a data-table row write to one-off', () => {
		expect(
			resolvedRoute([
				call('data-tables', { action: 'create' }),
				call('data-tables', { action: 'insert-rows' }),
			]),
		).toEqual({ kind: 'resolved', route: 'one-off', rule: 4 });
	});

	it('does not route a debugging-executions skill load alone to debug', () => {
		expect(resolvedRoute([call('load_skill', { skillId: 'debugging-executions' })])).toEqual({
			kind: 'judge',
			rule: 7,
		});
	});

	it.each(['list', 'get', 'debug'])('routes executions %s to debug', (action) => {
		expect(
			resolvedRoute([
				call('load_skill', { skillId: 'debugging-executions' }),
				call('executions', { action }),
			]),
		).toEqual({ kind: 'resolved', route: 'debug', rule: 5 });
	});
});

describe('same-direction clarification', () => {
	it.each([
		['workflow', 'workflow', true],
		['workflow', 'both', true],
		['workflow', 'agent', false],
		['workflow', 'none', false],
		['agent', 'agent', true],
		['agent', 'both', true],
		['agent', 'workflow', false],
		['agent', 'none', false],
		['one-off', 'both', false],
		['clarify', 'agent', false],
	] as const)('bucket %s with steer %s: %s', (bucket, steer, expected) => {
		expect(isSameDirectionClarify(bucket, clarify(steer))).toBe(expected);
	});

	it('does not count a non-clarify route', () => {
		expect(
			isSameDirectionClarify('workflow', {
				route: 'workflow',
				rule: 2,
				evidence: 'build-workflow',
			}),
		).toBe(false);
	});

	it('passes the v2 score but not the strict score', () => {
		const workflowCase = routingCase('workflow', ['workflow']);
		expect(trialPasses(workflowCase, clarify('workflow'))).toBe(true);
		expect(strictTrialPasses(workflowCase, clarify('workflow'))).toBe(false);

		const agentCase = routingCase('agent', ['agent']);
		expect(trialPasses(agentCase, clarify('both'))).toBe(true);
		expect(strictTrialPasses(agentCase, clarify('both'))).toBe(false);
		expect(trialPasses(agentCase, clarify('workflow'))).toBe(false);
	});

	it('keeps accept tokens in both scores', () => {
		const clarifyCase = routingCase('clarify', ['clarify:open']);
		expect(trialPasses(clarifyCase, clarify('none'))).toBe(true);
		expect(strictTrialPasses(clarifyCase, clarify('none'))).toBe(true);
		expect(trialPasses(clarifyCase, clarify('workflow'))).toBe(false);
	});
});

describe('staleStopCall', () => {
	it('flags a stopped trial whose calls no longer commit', () => {
		const stopped = trial(
			[call('data-tables', { action: 'list' }), call('data-tables', { action: 'create' })],
			{ streamStatus: 'stopped-on-route' },
		);
		expect(staleStopCall(stopped)).toBe('data-tables create');
	});

	it('accepts a stopped trial that ends on a committing call', () => {
		const stopped = trial([call('data-tables', { action: 'create' }), call('build-workflow')], {
			streamStatus: 'stopped-on-route',
		});
		expect(staleStopCall(stopped)).toBeUndefined();
	});

	it('ignores trials that were not stopped', () => {
		expect(staleStopCall(trial([call('data-tables', { action: 'create' })]))).toBeUndefined();
	});
});

describe('computeScopeMetrics', () => {
	function gradedTrial(
		pass: boolean,
		strictPass: boolean,
		sameDirectionClarify: boolean,
	): GradedTrial {
		return {
			trial: 1,
			streamStatus: 'completed',
			skillLoaded: false,
			resolution: clarify('workflow'),
			label: 'clarify:workflow',
			pass,
			strictPass,
			sameDirectionClarify,
			judged: true,
		};
	}

	function gradedCase(bucket: Bucket, trials: GradedTrial[]): GradedCase {
		const passedTrials = trials.filter((entry) => entry.pass).length;
		const strictPassedTrials = trials.filter((entry) => entry.strictPass).length;
		return {
			id: `case-${bucket}`,
			bucket,
			accepts: [],
			policyDependent: false,
			trials,
			passedTrials,
			pass: passedTrials * 3 >= trials.length * 2,
			strictPassedTrials,
			strictPass: strictPassedTrials * 3 >= trials.length * 2,
		};
	}

	it('reports strict scores and over-asking over the agent and workflow buckets', () => {
		const metrics = computeScopeMetrics([
			gradedCase('workflow', [
				gradedTrial(true, false, true),
				gradedTrial(true, false, true),
				gradedTrial(true, true, false),
			]),
			gradedCase('agent', [
				gradedTrial(true, true, false),
				gradedTrial(true, true, false),
				gradedTrial(false, false, false),
			]),
			gradedCase('clarify', [
				gradedTrial(true, true, false),
				gradedTrial(true, true, false),
				gradedTrial(true, true, false),
			]),
		]);

		expect(metrics.macroAccuracy).toBe(1);
		expect(metrics.strictMacroAccuracy).toBeCloseTo(2 / 3);
		expect(metrics.strictTrialPass).toMatchObject({ num: 6, den: 9 });
		expect(metrics.overAsking).toMatchObject({ num: 2, den: 6 });
		expect(metrics.buckets.workflow?.overAsking).toMatchObject({ num: 2, den: 3 });
		expect(metrics.buckets.agent?.overAsking).toMatchObject({ num: 0, den: 3 });
		expect(metrics.buckets.clarify?.overAsking).toBeUndefined();
	});
});
