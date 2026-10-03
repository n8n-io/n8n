import type { InstanceAiEvent } from '@n8n/api-types';

import { buildRoutingTrialRecord, ORCHESTRATOR_AGENT_ID } from '../routing-trial';

const base = { runId: 'run-1', agentId: ORCHESTRATOR_AGENT_ID };

function text(value: string, agentId = ORCHESTRATOR_AGENT_ID): InstanceAiEvent {
	return { type: 'text-delta', ...base, agentId, payload: { text: value } };
}

function call(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
	agentId = ORCHESTRATOR_AGENT_ID,
): InstanceAiEvent {
	return { type: 'tool-call', ...base, agentId, payload: { toolCallId, toolName, args } };
}

function result(toolCallId: string, value: unknown = {}): InstanceAiEvent {
	return { type: 'tool-result', ...base, payload: { toolCallId, result: value } };
}

const skillContent = { type: 'content', value: [{ type: 'text', text: '# Skill' }] };

describe('buildRoutingTrialRecord', () => {
	it('records orchestrator calls, skills, and the text after the last call', () => {
		const events: InstanceAiEvent[] = [
			text('Let me check. '),
			call('c1', 'load_skill', { name: 'intent-recognition' }),
			result('c1', skillContent),
			call('c3', 'load_skill', { skillId: 'no-such-skill' }),
			result('c3', { success: false, error: 'Unknown skill' }),
			call('c2', 'n8n-docs', { query: 'webhooks' }),
			{ type: 'tool-error', ...base, payload: { toolCallId: 'c2', error: 'boom' } },
			text('Webhooks '),
			text('start workflows.'),
		];

		const record = buildRoutingTrialRecord({
			trial: 1,
			events,
			durationMs: 10,
			streamStatus: 'completed',
		});

		expect(record.toolCalls).toEqual([
			{ toolName: 'load_skill', args: { name: 'intent-recognition' }, status: 'completed' },
			{ toolName: 'load_skill', args: { skillId: 'no-such-skill' }, status: 'completed' },
			{ toolName: 'n8n-docs', args: { query: 'webhooks' }, status: 'errored', error: 'boom' },
		]);
		expect(record.skillsLoaded).toEqual(['intent-recognition']);
		expect(record.finalText).toBe('Webhooks start workflows.');
		expect(record.fullText).toBe('Let me check.\n\nWebhooks start workflows.');
	});

	it('drops calls after the stop and keeps ask-user questions', () => {
		const events: InstanceAiEvent[] = [
			text('A few questions first.'),
			call('c1', 'ask-user', {
				introMessage: 'Before I build',
				questions: [{ id: 'q1', question: 'Agent or workflow?', options: ['Agent', 'Workflow'] }],
			}),
			call('c2', 'build-agent', { operation: 'create' }),
		];

		const record = buildRoutingTrialRecord({
			trial: 2,
			events,
			durationMs: 10,
			streamStatus: 'stopped-on-route',
			stop: { eventIndex: 2, toolName: 'ask-user', args: {} },
		});

		expect(record.toolCalls.map((c) => [c.toolName, c.status])).toEqual([['ask-user', 'pending']]);
		expect(record.askUserQuestions).toEqual([
			{
				question: 'Agent or workflow?',
				options: ['Agent', 'Workflow'],
				introMessage: 'Before I build',
			},
		]);
		expect(record.finalText).toBe('A few questions first.');
		expect(record.stoppedOn?.toolName).toBe('ask-user');
	});

	it('keeps sub-agent calls apart and reports spawned roles', () => {
		const events: InstanceAiEvent[] = [
			call('c1', 'build-agent', { operation: 'create' }),
			{
				type: 'agent-spawned',
				...base,
				agentId: 'builder-1',
				payload: { parentId: ORCHESTRATOR_AGENT_ID, role: 'agent-builder', tools: [] },
			},
			call('c2', 'write_config', {}, 'builder-1'),
			text('sub-agent text', 'builder-1'),
		];

		const record = buildRoutingTrialRecord({
			trial: 1,
			events,
			durationMs: 10,
			streamStatus: 'completed',
		});

		expect(record.toolCalls.map((c) => c.toolName)).toEqual(['build-agent']);
		expect(record.subAgentToolCalls).toEqual([
			{ toolName: 'write_config', args: {}, status: 'pending', agentRole: 'agent-builder' },
		]);
		expect(record.spawnedAgents).toEqual(['agent-builder']);
		expect(record.finalText).toBe('');
	});
});
