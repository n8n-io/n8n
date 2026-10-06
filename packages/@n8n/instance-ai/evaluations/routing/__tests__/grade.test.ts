import type { InstanceAiEvent } from '@n8n/api-types';

import { ORCHESTRATOR_AGENT_ID } from '../../discovery/types';
import type { RoutingCase } from '../cases';
import {
	afterQuestion,
	answeredQuestions,
	canReplyTo,
	casePasses,
	createRouteWatcher,
	type RouteResolution,
	routeLabel,
	traceSteps,
	trialPasses,
} from '../grade';
import type { JudgeInput, JudgeVerdict } from '../judge';

const base = { runId: 'run-1', agentId: ORCHESTRATOR_AGENT_ID };

function textEvent(value: string, agentId = ORCHESTRATOR_AGENT_ID): InstanceAiEvent {
	return { type: 'text-delta', ...base, agentId, payload: { text: value } };
}

function callEvent(
	toolName: string,
	args: Record<string, unknown> = {},
	agentId = ORCHESTRATOR_AGENT_ID,
): InstanceAiEvent {
	return { type: 'tool-call', ...base, agentId, payload: { toolCallId: toolName, toolName, args } };
}

/** The card of an ask-user call and the user's answer to it. */
function answerEvents(toolCallId = 'ask-user'): InstanceAiEvent[] {
	return [
		{
			type: 'confirmation-request',
			...base,
			payload: {
				requestId: 'request-1',
				toolCallId,
				toolName: 'ask-user',
				args: {},
				severity: 'info',
				message: 'Two questions',
				inputType: 'questions',
			},
		},
		{ type: 'tool-result', ...base, payload: { toolCallId, result: { answered: true } } },
	];
}

function pending(toolName: string, args: Record<string, unknown> = {}) {
	return { toolCallId: toolName, toolName, args };
}

function routingCase(
	bucket: RoutingCase['bucket'],
	accepts: RoutingCase['accepts'] = [],
	after: RoutingCase['after'] = [],
): RoutingCase {
	return { id: `route-${bucket}-x`, bucket, userMessage: 'Do the thing.', accepts, after };
}

const go: JudgeVerdict = {
	decision: 'continue',
	route: 'none',
	steer: 'none',
	reason: 'Explores.',
};

function stop(route: JudgeVerdict['route'], steer: JudgeVerdict['steer'] = 'none'): JudgeVerdict {
	return { decision: 'stop', route, steer, reason: `Picks ${route}.` };
}

/** A judge that returns the verdicts in order, then the last one again. */
function judgeReturning(...verdicts: Array<JudgeVerdict | Error>) {
	let index = 0;
	return vi.fn(async (_input: JudgeInput) => {
		const verdict = verdicts[Math.min(index++, verdicts.length - 1)];
		if (verdict instanceof Error) throw verdict;
		return await Promise.resolve(verdict);
	});
}

/** The user proxy replies to questions only, as `canReplyTo` does. */
const isQuestion = ({ route }: RouteResolution) => route === 'clarify';

const clarify = (steer: RouteResolution['steer']): RouteResolution => ({
	route: 'clarify',
	steer,
	evidence: 'ask-user call',
});

describe('traceSteps', () => {
	it('keeps the orchestrator text and calls in order and drops sub-agent events', () => {
		const steps = traceSteps([
			textEvent('Let me '),
			textEvent('check. '),
			callEvent('search-nodes', { query: 'slack' }),
			textEvent('sub-agent text', 'builder-1'),
			callEvent('write_config', {}, 'builder-1'),
			textEvent('Found it.'),
		]);

		expect(steps).toEqual([
			{ kind: 'text', text: 'Let me check.' },
			{ kind: 'call', toolName: 'search-nodes', args: { query: 'slack' } },
			{ kind: 'text', text: 'Found it.' },
		]);
	});

	it('adds the pending call last when it has no event yet', () => {
		const steps = traceSteps([textEvent('A question first.')], pending('ask-user'));

		expect(steps).toEqual([
			{ kind: 'text', text: 'A question first.' },
			{ kind: 'call', toolName: 'ask-user', args: {} },
		]);
	});

	it('adds the user answer after a question card and no other tool result', () => {
		const steps = traceSteps([
			callEvent('ask-user'),
			...answerEvents(),
			{ type: 'tool-result', ...base, payload: { toolCallId: 'search-nodes', result: [] } },
		]);

		expect(steps).toEqual([
			{ kind: 'call', toolName: 'ask-user', args: {} },
			{ kind: 'answer', result: { answered: true } },
		]);
	});

	it('does not add the pending call twice when its event is already in', () => {
		const steps = traceSteps([callEvent('ask-user')], pending('ask-user'));

		expect(steps).toEqual([{ kind: 'call', toolName: 'ask-user', args: {} }]);
	});
});

describe('createRouteWatcher', () => {
	it('stops before the call that the judge marks as the route', async () => {
		const judge = judgeReturning(go, stop('workflow', 'workflow'));
		const watcher = createRouteWatcher(judge);

		expect(await watcher.beforeToolCall(pending('search-nodes'), [])).toBe(false);
		expect(
			await watcher.beforeToolCall(pending('build-workflow'), [callEvent('search-nodes')]),
		).toBe(true);
		const resolution = await watcher.resolve({
			instanceEvents: [],
			streamStatus: 'stopped-on-route',
		});

		expect(resolution).toEqual({
			route: 'workflow',
			steer: 'workflow',
			evidence: 'build-workflow call',
			judgeReason: 'Picks workflow.',
		});
		expect(judge).toHaveBeenCalledTimes(2);
		expect(judge).toHaveBeenLastCalledWith({
			steps: [
				{ kind: 'call', toolName: 'search-nodes', args: {} },
				{ kind: 'call', toolName: 'build-workflow', args: {} },
			],
		});
	});

	it('lets the run go on when the judge stops without a route', async () => {
		const watcher = createRouteWatcher(judgeReturning(stop('none')));

		expect(await watcher.beforeToolCall(pending('search-nodes'), [])).toBe(false);
	});

	it('stops a parallel call without a second judge call once the route is picked', async () => {
		const judge = judgeReturning(stop('multi'));
		const watcher = createRouteWatcher(judge);

		const results = await Promise.all([
			watcher.beforeToolCall(pending('create-tasks'), []),
			watcher.beforeToolCall(pending('search-nodes'), []),
		]);

		expect(results).toEqual([true, true]);
		expect(judge).toHaveBeenCalledTimes(1);
	});

	it('asks the judge for the route of the full turn when no call stopped the run', async () => {
		const judge = judgeReturning(go, stop('answer'));
		const watcher = createRouteWatcher(judge);
		await watcher.beforeToolCall(pending('n8n-docs'), []);

		const resolution = await watcher.resolve({
			instanceEvents: [callEvent('n8n-docs'), textEvent('Webhooks start workflows.')],
			streamStatus: 'completed',
		});

		expect(resolution).toMatchObject({ route: 'answer', evidence: 'end of turn (completed)' });
		expect(judge).toHaveBeenLastCalledWith({
			steps: [
				{ kind: 'call', toolName: 'n8n-docs', args: {} },
				{ kind: 'text', text: 'Webhooks start workflows.' },
			],
			endStatus: 'completed',
		});
	});

	it('lets the run go on when a check fails and reports the error', async () => {
		const judge = judgeReturning(new Error('Routing judge failed: 529'), stop('debug'));
		const watcher = createRouteWatcher(judge);

		expect(await watcher.beforeToolCall(pending('executions'), [])).toBe(false);
		expect(await watcher.beforeToolCall(pending('executions'), [])).toBe(true);
		const resolution = await watcher.resolve({
			instanceEvents: [],
			streamStatus: 'stopped-on-route',
		});

		expect(resolution).toMatchObject({ route: 'debug', judgeError: 'Routing judge failed: 529' });
	});

	it('lets a question run when the user can reply, then stops on the route after the answer', async () => {
		const judge = judgeReturning(stop('clarify', 'agent'), stop('agent', 'agent'));
		const watcher = createRouteWatcher(judge, isQuestion);
		const answered = [callEvent('ask-user'), ...answerEvents()];

		expect(await watcher.beforeToolCall(pending('ask-user'), [])).toBe(false);
		expect(await watcher.beforeToolCall(pending('build-agent'), answered)).toBe(true);
		const resolution = await watcher.resolve({
			instanceEvents: answered,
			streamStatus: 'stopped-on-route',
		});

		expect(resolution).toMatchObject({
			route: 'agent',
			evidence: 'build-agent call',
			question: { route: 'clarify', steer: 'agent', evidence: 'ask-user call' },
		});
	});

	it('lets a second question run, then stops on a third with both questions in order', async () => {
		const judge = judgeReturning(stop('clarify'), stop('clarify', 'agent'), stop('clarify'));
		const watcher = createRouteWatcher(judge, isQuestion);
		const once = [callEvent('ask-user'), ...answerEvents()];
		const twice = [...once, callEvent('ask-user-2'), ...answerEvents('ask-user-2')];

		expect(await watcher.beforeToolCall(pending('ask-user'), [])).toBe(false);
		expect(await watcher.beforeToolCall(pending('ask-user-2'), once)).toBe(false);
		expect(await watcher.beforeToolCall(pending('ask-user-3'), twice)).toBe(true);
		const resolution = await watcher.resolve({
			instanceEvents: twice,
			streamStatus: 'stopped-on-route',
		});

		expect(routeLabel(resolution)).toBe('clarify:none>clarify:agent>clarify:none');
		expect(answeredQuestions(resolution)).toBe(2);
	});

	it('stops on a second question when the turn has one answer left', async () => {
		const watcher = createRouteWatcher(judgeReturning(stop('clarify')), isQuestion, 1);
		const answered = [callEvent('ask-user'), ...answerEvents()];

		expect(await watcher.beforeToolCall(pending('ask-user'), [])).toBe(false);
		expect(await watcher.beforeToolCall(pending('ask-user-2'), answered)).toBe(true);
	});

	it('drops the question when no answer reached the run', async () => {
		const watcher = createRouteWatcher(
			judgeReturning(stop('clarify'), stop('clarify')),
			isQuestion,
		);
		await watcher.beforeToolCall(pending('ask-user'), []);

		const resolution = await watcher.resolve({
			instanceEvents: [callEvent('ask-user')],
			streamStatus: 'timed-out',
		});

		expect(resolution.question).toBeUndefined();
		expect(resolution.route).toBe('clarify');
	});

	it('returns none with the error when the end-of-turn judge fails', async () => {
		const watcher = createRouteWatcher(judgeReturning(new Error('Routing judge failed: 529')));

		const resolution = await watcher.resolve({ instanceEvents: [], streamStatus: 'timed-out' });

		expect(resolution).toEqual({
			route: 'none',
			evidence: 'end of turn (timed-out), judge failed',
			judgeError: 'Routing judge failed: 529',
		});
	});
});

describe('trialPasses', () => {
	it.each<[RoutingCase['accepts'], RouteResolution, boolean]>([
		[['workflow'], { route: 'workflow', evidence: 'build-workflow' }, true],
		[['workflow'], { route: 'one-off', evidence: 'build-workflow' }, false],
		[['clarify'], clarify('workflow'), true],
		[['clarify:agent'], clarify('both'), true],
		[['clarify:agent'], clarify('none'), false],
		[['clarify:open'], clarify('none'), true],
		[['clarify:open'], clarify('workflow'), false],
	])('accepts %j with %j: %s', (accepts, resolution, expected) => {
		expect(trialPasses(routingCase('clarify', accepts), resolution)).toBe(expected);
	});

	it('fails a question toward the bucket artifact when the case accepts no question', () => {
		expect(trialPasses(routingCase('workflow', ['workflow']), clarify('workflow'))).toBe(false);
	});

	it('grades the route after an answer against the after routes only', () => {
		const openCase = routingCase('clarify', ['clarify:open'], ['agent']);
		const answered = (route: RouteResolution) => ({ ...route, question: clarify('none') });

		expect(trialPasses(openCase, answered({ route: 'agent', evidence: 'build-agent' }))).toBe(true);
		expect(trialPasses(openCase, answered({ route: 'workflow', evidence: 'build' }))).toBe(false);
		expect(trialPasses(openCase, answered(clarify('none')))).toBe(false);
	});
});

describe('canReplyTo', () => {
	it('replies only to a question that the case accepts', () => {
		const agentCase = routingCase('agent', ['agent', 'clarify:agent'], ['agent']);

		expect(canReplyTo(agentCase, clarify('agent'))).toBe(true);
		expect(canReplyTo(agentCase, { ...clarify('agent'), question: clarify('agent') })).toBe(true);
		expect(canReplyTo(agentCase, clarify('workflow'))).toBe(false);
		expect(canReplyTo(agentCase, { route: 'agent', evidence: 'build-agent' })).toBe(false);
	});
});

describe('routeLabel', () => {
	it('shows the answered question before the route', () => {
		expect(routeLabel({ route: 'agent', evidence: 'x', question: clarify('both') })).toBe(
			'clarify:both>agent',
		);
	});

	it('shows a question from an earlier turn first', () => {
		const route = { route: 'agent' as const, evidence: 'x', question: clarify('agent') };

		expect(routeLabel(afterQuestion(route, clarify('none')))).toBe(
			'clarify:none>clarify:agent>agent',
		);
	});
});

describe('casePasses', () => {
	it.each([
		[2, 3, true],
		[1, 3, false],
		[4, 6, true],
		[3, 6, false],
		[0, 0, false],
	])('%i of %i trials: %s', (passed, total, expected) => {
		expect(casePasses(passed, total)).toBe(expected);
	});
});
