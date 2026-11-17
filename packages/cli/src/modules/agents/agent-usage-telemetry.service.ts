import { TelemetryProxy } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type {
	AgentRunTelemetryType,
	IAgentConfigurationTelemetryProperties,
	IAgentExecutionTrackProperties,
	IAgentTurnFinishedTrackProperties,
} from './agent-telemetry.types';

interface IAgentExecutionCounts {
	message_count: number;
	token_count: number;
	tool_call_count: number;
}

interface IAgentExecutionCountsBuffer {
	[bufferKey: string]: IAgentExecutionCounts & {
		agent_id: string;
		user_id?: string;
		run_type: AgentRunTelemetryType;
		first_message_at?: string;
		counts_by_source: Record<string, IAgentExecutionCounts>;
	};
}

interface IAgentSessionMetrics {
	latency_ms: number;
	cost: number;
	token_count: number;
	tool_call_count: number;
	num_skills: number;
	turn_count: number;
	skill_load_count: number;
	loaded_skill_ids: Set<string>;
}

interface IAgentSessionMetricsBuffer {
	[bufferKey: string]: {
		agent_id: string;
		user_id?: string;
		agent_type: IAgentTurnFinishedTrackProperties['agent_type'];
		run_type: IAgentTurnFinishedTrackProperties['run_type'];
		turn_status: IAgentTurnFinishedTrackProperties['turn_status'];
		configuration: IAgentConfigurationTelemetryProperties;
		sessions: Record<string, IAgentSessionMetrics>;
		sessions_by_source: Record<string, Record<string, IAgentSessionMetrics>>;
	};
}

/**
 * Buffers agent usage counters in this process and sends them as aggregate
 * events each time the telemetry buffers flush.
 */
@Service()
export class AgentUsageTelemetryService {
	private agentExecutionCountsBuffer: IAgentExecutionCountsBuffer = {};

	private agentSessionMetricsBuffer: IAgentSessionMetricsBuffer = {};

	constructor(private readonly telemetry: TelemetryProxy) {
		telemetry.addBufferFlusher(() => this.flush());
	}

	flush(): void {
		this.flushAgentExecutionCounts();
		this.flushAgentSessionMetrics();
	}

	private getAgentExecutionCountsBufferKey(
		agentId: string,
		runType: AgentRunTelemetryType,
		userId?: string,
	) {
		return userId ? `${agentId}:${runType}:${userId}` : `${agentId}:${runType}`;
	}

	private flushAgentExecutionCounts() {
		const keysToReport = Object.keys(this.agentExecutionCountsBuffer).filter((bufferKey) => {
			const data = this.agentExecutionCountsBuffer[bufferKey];
			return data.message_count + data.token_count + data.tool_call_count > 0;
		});

		for (const bufferKey of keysToReport) {
			// Agent-level aggregate window keyed by persisted agent ID, run type and optional
			// n8n user ID. A resume-only window may legitimately report tokens or tools with
			// message_count = 0.
			const { agent_id, user_id, run_type, ...counts } = this.agentExecutionCountsBuffer[bufferKey];
			this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_EXECUTION_COUNT, {
				event_version: '3',
				agent_id,
				...(user_id ? { user_id } : {}),
				run_type,
				...counts,
			});
		}

		this.agentExecutionCountsBuffer = {};
	}

	private getAgentSessionMetricsBufferKey(properties: IAgentTurnFinishedTrackProperties) {
		return [
			properties.agent_id,
			properties.user_id,
			properties.run_type,
			properties.turn_status,
			JSON.stringify(properties.configuration),
		].join(':');
	}

	private flushAgentSessionMetrics() {
		for (const bucket of Object.values(this.agentSessionMetricsBuffer)) {
			if (Object.keys(bucket.sessions).length === 0) continue;

			this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_SESSION_METRICS, {
				event_version: '1',
				agent_id: bucket.agent_id,
				...(bucket.user_id ? { user_id: bucket.user_id } : {}),
				...(bucket.agent_type ? { agent_type: bucket.agent_type } : {}),
				...bucket.configuration,
				run_type: bucket.run_type,
				turn_status: bucket.turn_status,
				...this.sumAgentSessionMetrics(bucket.sessions),
				counts_by_source: Object.fromEntries(
					Object.entries(bucket.sessions_by_source).map(([source, sessions]) => [
						source,
						this.sumAgentSessionMetrics(sessions),
					]),
				),
			});
		}

		this.agentSessionMetricsBuffer = {};
	}

	private sumAgentSessionMetrics(sessionsById: Record<string, IAgentSessionMetrics>) {
		const sessions = Object.values(sessionsById);
		return {
			session_count: sessions.length,
			turn_count: sessions.reduce((total, session) => total + session.turn_count, 0),
			latency_ms_sum: sessions.reduce((total, session) => total + session.latency_ms, 0),
			cost_sum: sessions.reduce((total, session) => total + session.cost, 0),
			token_count_sum: sessions.reduce((total, session) => total + session.token_count, 0),
			tool_call_count_sum: sessions.reduce((total, session) => total + session.tool_call_count, 0),
			num_skills_sum: sessions.reduce((total, session) => total + session.num_skills, 0),
			skill_load_count_sum: sessions.reduce(
				(total, session) => total + session.skill_load_count,
				0,
			),
			loaded_skill_ids: [
				...new Set(sessions.flatMap((session) => [...session.loaded_skill_ids])),
			].sort(),
		};
	}

	trackAgentExecution(properties: IAgentExecutionTrackProperties) {
		if (!this.telemetry.isEnabled()) return;

		const {
			agent_id,
			user_id,
			run_type,
			message_count = 0,
			token_count = 0,
			tool_call_count = 0,
		} = properties;
		const bufferKey = this.getAgentExecutionCountsBufferKey(agent_id, run_type, user_id);

		this.agentExecutionCountsBuffer[bufferKey] = this.agentExecutionCountsBuffer[bufferKey] ?? {
			agent_id,
			...(user_id ? { user_id } : {}),
			run_type,
			message_count: 0,
			token_count: 0,
			tool_call_count: 0,
			counts_by_source: {},
		};

		const agentExecutionCounts = this.agentExecutionCountsBuffer[bufferKey];
		if (message_count > 0) {
			agentExecutionCounts.first_message_at ??= new Date().toISOString();
		}
		agentExecutionCounts.message_count += message_count;
		agentExecutionCounts.token_count += token_count;
		agentExecutionCounts.tool_call_count += tool_call_count;

		const source = properties.source || 'unknown';
		const sourceCounts = (agentExecutionCounts.counts_by_source[source] ??= {
			message_count: 0,
			token_count: 0,
			tool_call_count: 0,
		});
		sourceCounts.message_count += message_count;
		sourceCounts.token_count += token_count;
		sourceCounts.tool_call_count += tool_call_count;
	}

	trackAgentTurnFinished(properties: IAgentTurnFinishedTrackProperties) {
		if (!this.telemetry.isEnabled()) return;

		const bufferKey = this.getAgentSessionMetricsBufferKey(properties);
		this.agentSessionMetricsBuffer[bufferKey] = this.agentSessionMetricsBuffer[bufferKey] ?? {
			agent_id: properties.agent_id,
			user_id: properties.user_id,
			agent_type: properties.agent_type,
			run_type: properties.run_type,
			turn_status: properties.turn_status,
			configuration: properties.configuration,
			sessions: {},
			sessions_by_source: {},
		};

		const bucket = this.agentSessionMetricsBuffer[bufferKey];
		const source = properties.source || 'unknown';
		const sourceSessions = (bucket.sessions_by_source[source] ??= {});
		// A session can contain turns from several sources. Keep the total deduplicated.
		for (const sessions of [bucket.sessions, sourceSessions]) {
			const session = sessions[properties.thread_id] ?? {
				latency_ms: 0,
				cost: 0,
				token_count: 0,
				tool_call_count: 0,
				num_skills: properties.configuration.num_skills,
				turn_count: 0,
				skill_load_count: 0,
				loaded_skill_ids: new Set<string>(),
			};

			session.latency_ms += properties.latency_ms;
			session.cost += properties.cost;
			session.token_count += properties.token_count;
			session.tool_call_count += properties.tool_call_count;
			session.skill_load_count += properties.skill_load_count ?? 0;
			for (const skillId of properties.loaded_skill_ids ?? []) {
				session.loaded_skill_ids.add(skillId);
			}
			session.turn_count++;
			sessions[properties.thread_id] = session;
		}
	}

	// test helpers
	getAgentExecutionCountsBuffer(): IAgentExecutionCountsBuffer {
		return this.agentExecutionCountsBuffer;
	}

	getAgentSessionMetricsBuffer(): IAgentSessionMetricsBuffer {
		return this.agentSessionMetricsBuffer;
	}
}
