import type { TelemetryProxy } from '@n8n/backend-services';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentUsageTelemetryService } from '../agent-usage-telemetry.service';

describe('AgentUsageTelemetryService', () => {
	const telemetryProxy = mock<TelemetryProxy>();
	const spyTrack: MockInstance = telemetryProxy.track;
	let service: AgentUsageTelemetryService;

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		telemetryProxy.isEnabled.mockReturnValue(true);
		service = new AgentUsageTelemetryService(telemetryProxy);
	});

	test('should add its flush to the telemetry buffer flushers', () => {
		expect(telemetryProxy.addBufferFlusher).toHaveBeenCalledOnce();
		service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', message_count: 1 });

		const [flusher] = telemetryProxy.addBufferFlusher.mock.calls[0];
		flusher();

		expect(spyTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT,
			expect.objectContaining({ agent_id: 'agent-1', message_count: 1 }),
		);
		expect(service.getAgentExecutionCountsBuffer()).toEqual({});
	});

	describe('trackAgentExecution', () => {
		const firstMessageAt = '2026-10-09T08:14:22.517Z';

		beforeEach(() => {
			fakeTestSystemTime(firstMessageAt);
		});

		test('should aggregate agent execution counters by agent ID', () => {
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', message_count: 1 });
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', token_count: 15 });
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', tool_call_count: 2 });
			fakeTestSystemTime('2026-10-09T09:14:22.517Z');
			service.trackAgentExecution({ agent_id: 'agent-2', run_type: 'test', message_count: 1 });

			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(service.getAgentExecutionCountsBuffer()).toEqual({
				'agent-1:test': {
					agent_id: 'agent-1',
					run_type: 'test',
					first_message_at: firstMessageAt,
					message_count: 1,
					token_count: 15,
					tool_call_count: 2,
					counts_by_source: { unknown: { message_count: 1, token_count: 15, tool_call_count: 2 } },
				},
				'agent-2:test': {
					agent_id: 'agent-2',
					run_type: 'test',
					first_message_at: '2026-10-09T09:14:22.517Z',
					message_count: 1,
					token_count: 0,
					tool_call_count: 0,
					counts_by_source: { unknown: { message_count: 1, token_count: 0, tool_call_count: 0 } },
				},
			});
		});

		test('should flush source counters in one event and reset the buffer', () => {
			const chatRun = { agent_id: 'agent-1', run_type: 'test' as const, source: 'chat' };
			fakeTestSystemTime('2026-10-09T08:00:00.000Z');
			service.trackAgentExecution({ ...chatRun, token_count: 10 });
			service.trackAgentExecution({ ...chatRun, tool_call_count: 1 });
			fakeTestSystemTime(firstMessageAt);
			service.trackAgentExecution({ ...chatRun, message_count: 2 });
			fakeTestSystemTime('2026-10-09T09:14:22.517Z');
			service.trackAgentExecution({
				...chatRun,
				source: 'instance-ai',
				message_count: 1,
				token_count: 5,
				tool_call_count: 1,
			});

			fakeTestSystemTime('2026-10-09T12:02:11.004Z');
			service.flush();

			expect(spyTrack).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT,
				{
					event_version: '3',
					agent_id: 'agent-1',
					run_type: 'test',
					first_message_at: firstMessageAt,
					message_count: 3,
					token_count: 15,
					tool_call_count: 2,
					counts_by_source: {
						chat: { message_count: 2, token_count: 10, tool_call_count: 1 },
						'instance-ai': { message_count: 1, token_count: 5, tool_call_count: 1 },
					},
				},
			);
			expect(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT.getValidationError(spyTrack.mock.calls[0][1]),
			).toBeNull();
			expect(service.getAgentExecutionCountsBuffer()).toEqual({});
		});

		test('should preserve source values within separate test and production events', () => {
			service.trackAgentExecution({
				agent_id: 'agent-1',
				run_type: 'test',
				source: 'n8n_chat',
				message_count: 1,
			});
			fakeTestSystemTime('2026-10-09T09:14:22.517Z');
			service.trackAgentExecution({
				agent_id: 'agent-1',
				run_type: 'production',
				source: 'n8n_chat_production',
				message_count: 1,
			});
			fakeTestSystemTime('2026-10-09T10:14:22.517Z');
			service.trackAgentExecution({
				agent_id: 'agent-1',
				run_type: 'production',
				source: 'n8n_chat',
				message_count: 1,
			});

			service.flush();

			expect(spyTrack).toHaveBeenCalledTimes(2);
			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT,
				expect.objectContaining({
					run_type: 'test',
					first_message_at: firstMessageAt,
					message_count: 1,
					counts_by_source: { n8n_chat: { message_count: 1, token_count: 0, tool_call_count: 0 } },
				}),
			);
			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT,
				expect.objectContaining({
					run_type: 'production',
					first_message_at: '2026-10-09T09:14:22.517Z',
					message_count: 2,
					counts_by_source: {
						n8n_chat_production: { message_count: 1, token_count: 0, tool_call_count: 0 },
						n8n_chat: { message_count: 1, token_count: 0, tool_call_count: 0 },
					},
				}),
			);
		});

		test('should reset counters and the first message time between buffer windows', () => {
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', message_count: 1 });

			service.flush();
			spyTrack.mockClear();

			fakeTestSystemTime('2026-10-09T12:02:11.004Z');
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', token_count: 20 });

			service.flush();

			expect(spyTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT, {
				event_version: '3',
				agent_id: 'agent-1',
				run_type: 'test',
				message_count: 0,
				token_count: 20,
				tool_call_count: 0,
				counts_by_source: { unknown: { message_count: 0, token_count: 20, tool_call_count: 0 } },
			});
			expect(spyTrack.mock.calls[0][1]).not.toHaveProperty('first_message_at');
			expect(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT.getValidationError(spyTrack.mock.calls[0][1]),
			).toBeNull();
			expect(service.getAgentExecutionCountsBuffer()).toEqual({});

			fakeTestSystemTime('2026-10-09T14:00:00.000Z');
			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', message_count: 1 });

			service.flush();

			expect(spyTrack).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT,
				expect.objectContaining({
					message_count: 1,
					first_message_at: '2026-10-09T14:00:00.000Z',
				}),
			);
		});

		test('should flush attributed and unattributed agent execution counters separately', () => {
			service.trackAgentExecution({
				agent_id: 'agent-1',
				user_id: 'user-1',
				run_type: 'test',
				source: 'chat',
				message_count: 1,
			});
			service.trackAgentExecution({
				agent_id: 'agent-1',
				run_type: 'test',
				source: 'slack',
				token_count: 20,
			});

			service.flush();

			expect(spyTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT, {
				event_version: '3',
				agent_id: 'agent-1',
				user_id: 'user-1',
				run_type: 'test',
				first_message_at: firstMessageAt,
				message_count: 1,
				token_count: 0,
				tool_call_count: 0,
				counts_by_source: { chat: { message_count: 1, token_count: 0, tool_call_count: 0 } },
			});
			expect(spyTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT, {
				event_version: '3',
				agent_id: 'agent-1',
				run_type: 'test',
				message_count: 0,
				token_count: 20,
				tool_call_count: 0,
				counts_by_source: { slack: { message_count: 0, token_count: 20, tool_call_count: 0 } },
			});
			expect(service.getAgentExecutionCountsBuffer()).toEqual({});
		});

		test('should not buffer when telemetry is off', () => {
			telemetryProxy.isEnabled.mockReturnValue(false);

			service.trackAgentExecution({ agent_id: 'agent-1', run_type: 'test', message_count: 1 });

			expect(service.getAgentExecutionCountsBuffer()).toEqual({});
		});
	});

	describe('trackAgentTurnFinished', () => {
		const configuration = {
			model: 'anthropic/claude-sonnet-4-5',
			channels: ['slack'],
			tool_types: ['custom'],
			tool_count: 1,
			num_skills: 2,
			memory_type: 'n8n_observational' as const,
		};

		test('should buffer agent session metrics without tracking immediately', () => {
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});

			expect(spyTrack).toHaveBeenCalledTimes(0);
			expect(Object.values(service.getAgentSessionMetricsBuffer())).toEqual([
				expect.objectContaining({
					agent_id: 'agent-1',
					run_type: 'test',
					turn_status: 'succeeded',
					configuration,
					sessions: {
						'thread-1': {
							latency_ms: 100,
							cost: 10,
							token_count: 1000,
							tool_call_count: 1,
							num_skills: 2,
							turn_count: 1,
							skill_load_count: 0,
							loaded_skill_ids: new Set(),
						},
					},
				}),
			]);
		});

		test('should split turn metrics by source and count distinct sessions', () => {
			for (const [thread_id, source, latency_ms, cost, token_count, tool_call_count] of [
				['thread-1', 'chat', 100, 10, 1000, 1],
				['thread-1', 'instance-ai', 200, 20, 2000, 3],
				['thread-2', 'chat', 400, 40, 4000, 5],
				['thread-3', 'instance-ai', 800, 80, 8000, 7],
				['thread-1', 'chat', 50, 5, 500, 2],
			] as const) {
				service.trackAgentTurnFinished({
					agent_id: 'agent-1',
					user_id: 'user-1',
					thread_id,
					source,
					run_type: 'test',
					turn_status: 'succeeded',
					configuration,
					latency_ms,
					cost,
					token_count,
					tool_call_count,
				});
			}

			service.flush();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
			)?.[1];
			expect(spyTrack).toHaveBeenCalledTimes(1);
			expect(payload).toEqual({
				event_version: '1',
				agent_id: 'agent-1',
				user_id: 'user-1',
				...configuration,
				run_type: 'test',
				turn_status: 'succeeded',
				session_count: 3,
				turn_count: 5,
				latency_ms_sum: 1550,
				cost_sum: 155,
				token_count_sum: 15500,
				tool_call_count_sum: 18,
				num_skills_sum: 6,
				skill_load_count_sum: 0,
				loaded_skill_ids: [],
				counts_by_source: {
					chat: {
						session_count: 2,
						turn_count: 3,
						latency_ms_sum: 550,
						cost_sum: 55,
						token_count_sum: 5500,
						tool_call_count_sum: 8,
						num_skills_sum: 4,
						skill_load_count_sum: 0,
						loaded_skill_ids: [],
					},
					'instance-ai': {
						session_count: 2,
						turn_count: 2,
						latency_ms_sum: 1000,
						cost_sum: 100,
						token_count_sum: 10000,
						tool_call_count_sum: 10,
						num_skills_sum: 4,
						skill_load_count_sum: 0,
						loaded_skill_ids: [],
					},
				},
			});
			expect(TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS.getValidationError(payload)).toBeNull();
			expect(payload).not.toHaveProperty('latency_ms_avg');
			expect(payload).not.toHaveProperty('latency_ms_p25');
			expect(payload).not.toHaveProperty('cost_avg');
			expect(payload).not.toHaveProperty('tool_call_count_p50');
			expect(payload).not.toHaveProperty('num_skills_p75');
			// Saved agents carry no agent_type (the exact toEqual above also
			// guards against it sneaking in).
			expect(payload).not.toHaveProperty('agent_type');
		});

		test('should sum skill loads and report the distinct loaded skills', () => {
			for (const [thread_id, source, skill_load_count, loaded_skill_ids] of [
				['thread-1', 'chat', 2, ['skill_b', 'skill_a']],
				['thread-1', 'chat', 1, ['skill_a']],
				['thread-2', 'slack', 1, ['skill_c']],
				['thread-3', 'slack', 0, []],
			] as const) {
				service.trackAgentTurnFinished({
					agent_id: 'agent-1',
					thread_id,
					source,
					run_type: 'production',
					turn_status: 'succeeded',
					configuration,
					latency_ms: 100,
					cost: 10,
					token_count: 1000,
					tool_call_count: skill_load_count,
					skill_load_count,
					loaded_skill_ids: [...loaded_skill_ids],
				});
			}

			service.flush();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
			)?.[1];
			expect(payload).toEqual(
				expect.objectContaining({
					skill_load_count_sum: 4,
					loaded_skill_ids: ['skill_a', 'skill_b', 'skill_c'],
					counts_by_source: {
						chat: expect.objectContaining({
							skill_load_count_sum: 3,
							loaded_skill_ids: ['skill_a', 'skill_b'],
						}),
						slack: expect.objectContaining({
							skill_load_count_sum: 1,
							loaded_skill_ids: ['skill_c'],
						}),
					},
				}),
			);
			expect(TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS.getValidationError(payload)).toBeNull();
		});

		test('should carry agent_type through to the flushed payload for inline runs', () => {
			service.trackAgentTurnFinished({
				agent_id: 'inline:wf-1:Message an Agent',
				agent_type: 'inline',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});

			service.flush();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
			)?.[1];
			expect(payload).toEqual(
				expect.objectContaining({
					agent_id: 'inline:wf-1:Message an Agent',
					agent_type: 'inline',
				}),
			);
			expect(service.getAgentSessionMetricsBuffer()).toEqual({});
		});

		test('should flush turn status and run type buckets separately', () => {
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				source: 'n8n_chat',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-2',
				run_type: 'production',
				source: 'n8n_chat_production',
				turn_status: 'failed',
				configuration,
				latency_ms: 200,
				cost: 20,
				token_count: 2000,
				tool_call_count: 2,
			});

			service.flush();

			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
				expect.objectContaining({
					run_type: 'test',
					turn_status: 'succeeded',
					latency_ms_sum: 100,
					counts_by_source: { n8n_chat: expect.objectContaining({ turn_count: 1 }) },
				}),
			);
			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'failed',
					latency_ms_sum: 200,
					counts_by_source: { n8n_chat_production: expect.objectContaining({ turn_count: 1 }) },
				}),
			);
		});

		test('should keep mixed turn outcomes separate for the same session', () => {
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 200,
				cost: 20,
				token_count: 2000,
				tool_call_count: 2,
			});
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'production',
				turn_status: 'failed',
				configuration,
				latency_ms: 400,
				cost: 40,
				token_count: 4000,
				tool_call_count: 4,
			});

			service.flush();

			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'succeeded',
					session_count: 1,
					turn_count: 2,
					latency_ms_sum: 300,
					cost_sum: 30,
					tool_call_count_sum: 3,
					num_skills_sum: 2,
				}),
			);
			expect(spyTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
				expect.objectContaining({
					run_type: 'production',
					turn_status: 'failed',
					session_count: 1,
					turn_count: 1,
					latency_ms_sum: 400,
					cost_sum: 40,
					tool_call_count_sum: 4,
					num_skills_sum: 2,
				}),
			);
		});

		test('should not emit thread IDs', () => {
			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});

			service.flush();

			const payload = spyTrack.mock.calls.find(
				([eventName]) => eventName === TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS,
			)?.[1];
			expect(payload).not.toHaveProperty('thread_id');
			expect(JSON.stringify(payload)).not.toContain('thread-1');
		});

		test('should not buffer when telemetry is off', () => {
			telemetryProxy.isEnabled.mockReturnValue(false);

			service.trackAgentTurnFinished({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration,
				latency_ms: 100,
				cost: 10,
				token_count: 1000,
				tool_call_count: 1,
			});

			expect(service.getAgentSessionMetricsBuffer()).toEqual({});
		});
	});
});

const fakeTestSystemTime = (dateTime: string | Date): Date => {
	const dt = new Date(dateTime);
	vi.setSystemTime(dt);
	return dt;
};
