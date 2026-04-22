import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentConfigFingerprint, AgentTelemetryStatus } from './agentTelemetry.utils';

export type AgentChatMode = 'build' | 'test';
export type AgentConfigPart =
	| 'instructions'
	| 'model'
	| 'memory'
	| 'tools'
	| 'triggers'
	| 'name'
	| 'description';

export function useAgentTelemetry() {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const common = () => ({ session_id: rootStore.pushRef });

	function trackClickedNewAgent(source: 'button' | 'dropdown') {
		telemetry.track('User clicked new agent', { source, ...common() });
	}

	function trackSubmittedMessage(params: {
		agentId: string;
		messageHash: string;
		messageLength: number;
		mode: AgentChatMode;
		status: AgentTelemetryStatus;
		agentConfig: AgentConfigFingerprint;
	}) {
		telemetry.track('User submitted message to agent', {
			agent_id: params.agentId,
			message_hash: params.messageHash,
			message_length: params.messageLength,
			mode: params.mode,
			status: params.status,
			agent_config: params.agentConfig,
			...common(),
		});
	}

	function trackEditedConfig(params: {
		agentId: string;
		part: AgentConfigPart;
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		telemetry.track('User edited agent config', {
			agent_id: params.agentId,
			part: params.part,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackAddedTrigger(params: {
		agentId: string;
		triggerType: string;
		triggers: string[];
		status: AgentTelemetryStatus;
	}) {
		telemetry.track('User added trigger to agent', {
			agent_id: params.agentId,
			trigger_type: params.triggerType,
			triggers: params.triggers,
			status: params.status,
			...common(),
		});
	}

	function trackAddedTools(params: {
		agentId: string;
		toolAdded: string;
		tools: string[];
		status: AgentTelemetryStatus;
	}) {
		telemetry.track('User added tools to agent', {
			agent_id: params.agentId,
			tool_added: params.toolAdded,
			tools: params.tools,
			status: params.status,
			...common(),
		});
	}

	function trackPublishedAgent(params: { agentId: string; configVersion: string }) {
		telemetry.track('User published agent', {
			agent_id: params.agentId,
			config_version: params.configVersion,
			status: 'production' as const,
			...common(),
		});
	}

	function trackUnpublishedAgent(params: { agentId: string }) {
		telemetry.track('User unpublished agent', {
			agent_id: params.agentId,
			status: 'draft' as const,
			...common(),
		});
	}

	return {
		trackClickedNewAgent,
		trackSubmittedMessage,
		trackEditedConfig,
		trackAddedTrigger,
		trackAddedTools,
		trackPublishedAgent,
		trackUnpublishedAgent,
	};
}
