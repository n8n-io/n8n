import type { AgentExecutionLogPayload, AgentExecutionLogRef } from './types';

export const AGENT_EXECUTION_LOG_BUNDLE_VERSION = 1;

export const AGENT_EXECUTION_LOG_BUNDLE_FILENAME = 'bundle.json';

export const agentExecutionLogKey = ({ agentId, threadId, executionId }: AgentExecutionLogRef) =>
	[
		'agents',
		agentId,
		'threads',
		threadId,
		'executions',
		executionId,
		'execution_log',
		AGENT_EXECUTION_LOG_BUNDLE_FILENAME,
	]
		.map(encodeURIComponent)
		.join('/');

export const measureAgentExecutionLogBundleBytes = (payload: AgentExecutionLogPayload) =>
	Buffer.byteLength(
		JSON.stringify({ ...payload, version: AGENT_EXECUTION_LOG_BUNDLE_VERSION }),
		'utf-8',
	);
