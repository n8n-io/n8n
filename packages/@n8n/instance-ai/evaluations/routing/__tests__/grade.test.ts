import type { InstanceAiEvent } from '@n8n/api-types';

import type { RoutingCase } from '../cases';
import {
	casePasses,
	readRoutingTrial,
	resolveRoute,
	type RouteResolution,
	type RoutingToolCall,
	type RoutingTrial,
	trialPasses,
} from '../grade';
import type { JudgeInput, JudgeVerdict } from '../judge';
import { ORCHESTRATOR_AGENT_ID } from '../route-rules';

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

function read(instanceEvents: InstanceAiEvent[]): RoutingTrial {
	return readRoutingTrial({ instanceEvents, streamStatus: 'completed' });
}

function routingCase(
	bucket: RoutingCase['bucket'],
	accepts: RoutingCase['accepts'] = [],
): RoutingCase {
	return { id: `route-${bucket}-x`, bucket, userMessage: 'Do the thing.', accepts, source: 'test' };
}

function call(toolName: string, args: Record<string, unknown> = {}): RoutingToolCall {
	return { toolName, args };
}

function trial(toolCalls: RoutingToolCall[], finalText = 'Here is what I found.'): RoutingTrial {
	return { toolCalls, finalText, streamStatus: 'completed' };
}

function judgeReturning(verdict: JudgeVerdict) {
	return vi.fn(async (_input: JudgeInput) => await Promise.resolve(verdict));
}

const clarify = (steer: RouteResolution['steer']): RouteResolution => ({
	route: 'clarify',
	steer,
	evidence: 'ask-user',
});

describe('readRoutingTrial', () => {
	it('keeps orchestrator calls up to and including the first committing call', () => {
		const result = read([
			callEvent('load_skill', { skillId: 'planning' }),
			callEvent('data-tables', { action: 'create' }),
			callEvent('write_config', {}, 'builder-1'),
			callEvent('build-workflow'),
			callEvent('ask-user'),
		]);

		expect(result.toolCalls.map((c) => c.toolName)).toEqual([
			'load_skill',
			'data-tables',
			'build-workflow',
		]);
	});

	it('reads the text after the last call', () => {
		const result = read([
			textEvent('Let me check. '),
			callEvent('n8n-docs', { query: 'webhooks' }),
			textEvent('Webhooks '),
			textEvent('sub-agent text', 'builder-1'),
			textEvent('start workflows.'),
		]);

		expect(result.finalText).toBe('Webhooks start workflows.');
	});

	it('falls back to the last text before the calls when no text follows them', () => {
		const result = read([
			textEvent('A few questions first.'),
			callEvent('ask-user'),
			textEvent('Text after the stop.'),
		]);

		expect(result.finalText).toBe('A few questions first.');
	});
});

describe('resolveRoute', () => {
	it.each<[string, RoutingToolCall[], RouteResolution['route']]>([
		['build-agent', [call('build-agent', { operation: 'create' })], 'agent'],
		[
			'build-workflow after an exploring build-agent',
			[call('build-agent', { operation: 'exploring' }), call('build-workflow')],
			'workflow',
		],
		['one-off build', [call('build-workflow', { executionIntent: 'one-off' })], 'one-off'],
		['create-tasks', [call('create-tasks')], 'multi'],
		[
			'build after data-table schema setup',
			[call('data-tables', { action: 'create' }), call('build-workflow')],
			'workflow',
		],
		['data-table row write', [call('data-tables', { action: 'insert-rows' })], 'one-off'],
		['node execution', [call('nodes', { action: 'execute' })], 'one-off'],
		['workflow publish', [call('workflows', { action: 'publish' })], 'one-off'],
		[
			'execution read after the debugging skill',
			[
				call('load_skill', { skillId: 'debugging-executions' }),
				call('executions', { action: 'get' }),
			],
			'debug',
		],
	])('routes %s from the calls alone', async (_name, calls, route) => {
		const judge = judgeReturning({ kind: 'answer', steer: 'none', reason: 'unused' });

		const resolution = await resolveRoute(routingCase('workflow'), trial(calls), judge);

		expect(resolution.route).toBe(route);
		expect(judge).not.toHaveBeenCalled();
	});

	it('keeps an ask-user card as clarify and takes only the steer from the judge', async () => {
		const judge = judgeReturning({ kind: 'answer', steer: 'agent', reason: 'Asks for a persona.' });
		const askUser = call('ask-user', {
			introMessage: 'Before I build',
			questions: [
				{ id: 'q1', question: 'Which tone?', type: 'single', options: ['Formal', 'Casual'] },
			],
		});

		const resolution = await resolveRoute(
			routingCase('agent'),
			trial([askUser], 'Two questions.'),
			judge,
		);

		expect(resolution).toMatchObject({ route: 'clarify', steer: 'agent' });
		expect(judge).toHaveBeenCalledWith({
			mode: 'ask-user',
			userMessage: 'Do the thing.',
			askUserIntro: 'Before I build',
			askUserQuestions: [{ question: 'Which tone?', options: ['Formal', 'Casual'] }],
			finalText: 'Two questions.',
		});
	});

	it('takes the kind and the steer from the judge for a reply without a committing call', async () => {
		const judge = judgeReturning({ kind: 'decline', steer: 'none', reason: 'Refuses.' });

		const resolution = await resolveRoute(
			routingCase('decline'),
			trial([call('data-tables', { action: 'create' })], 'I cannot do that.'),
			judge,
		);

		expect(resolution).toMatchObject({ route: 'decline', steer: 'none', judgeReason: 'Refuses.' });
		expect(judge).toHaveBeenCalledWith(expect.objectContaining({ mode: 'text' }));
	});

	it('returns none without the judge when the reply has no call and no text', async () => {
		const judge = judgeReturning({ kind: 'answer', steer: 'none', reason: 'unused' });

		const resolution = await resolveRoute(routingCase('answer'), trial([], ''), judge);

		expect(resolution.route).toBe('none');
		expect(judge).not.toHaveBeenCalled();
	});

	it('returns none with the error when the judge fails', async () => {
		const judge = vi.fn(async () => await Promise.reject(new Error('Routing judge failed: 529')));

		const resolution = await resolveRoute(routingCase('answer'), trial([]), judge);

		expect(resolution).toMatchObject({ route: 'none', judgeError: 'Routing judge failed: 529' });
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

	it.each<[RoutingCase['bucket'], RouteResolution['steer'], boolean]>([
		['workflow', 'workflow', true],
		['workflow', 'both', true],
		['workflow', 'agent', false],
		['workflow', 'none', false],
		['agent', 'agent', true],
		['agent', 'both', true],
		['agent', 'workflow', false],
		['one-off', 'both', false],
	])('in the %s bucket, a clarify with steer %s passes: %s', (bucket, steer, expected) => {
		expect(
			trialPasses(routingCase(bucket, [bucket === 'agent' ? 'agent' : 'workflow']), clarify(steer)),
		).toBe(expected);
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
