import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentConfigFingerprint, AgentTelemetryStatus } from './agentTelemetry.utils';

export type AgentChatMode = 'build' | 'test';
export type AgentConfigPart =
	| 'instructions'
	| 'model'
	| 'memory'
	| 'tools'
	| 'skills'
	| 'triggers'
	| 'name'
	| 'description';

export function useAgentTelemetry() {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const common = () => ({ session_id: rootStore.pushRef });

	// Telemetry is best-effort: every track call is wrapped so a RudderStack
	// failure can never surface to a caller (and never takes down a critical
	// path like publish or save).
	function safeTrack(event: string, props: ITelemetryTrackProperties) {
		try {
			telemetry.track(event, props);
		} catch {
			// Swallow — telemetry must not break user-facing flows.
		}
	}

	function trackClickedNewAgent(source: 'button' | 'dropdown') {
		safeTrack('User clicked new agent', { source, ...common() });
	}

	function trackSubmittedMessage(params: {
		agentId: string;
		mode: AgentChatMode;
		status: AgentTelemetryStatus;
		agentConfig: AgentConfigFingerprint;
	}) {
		safeTrack('User submitted message to agent', {
			agent_id: params.agentId,
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
		safeTrack('User edited agent config', {
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
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		safeTrack('User added trigger to agent', {
			agent_id: params.agentId,
			trigger_type: params.triggerType,
			triggers: params.triggers,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackAddedTools(params: {
		agentId: string;
		toolAdded: string;
		tools: string[];
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		safeTrack('User added tools to agent', {
			agent_id: params.agentId,
			tool_added: params.toolAdded,
			tools: params.tools,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackAddedSkills(params: {
		agentId: string;
		skillAdded: string;
		skills: string[];
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		safeTrack('User added skills to agent', {
			agent_id: params.agentId,
			skill_added: params.skillAdded,
			skills: params.skills,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackPublishedAgent(params: { agentId: string; configVersion: string }) {
		safeTrack('User published agent', {
			agent_id: params.agentId,
			config_version: params.configVersion,
			status: 'production' as const,
			...common(),
		});
	}

	function trackUnpublishedAgent(params: { agentId: string }) {
		safeTrack('User unpublished agent', {
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
		trackAddedSkills,
		trackPublishedAgent,
		trackUnpublishedAgent,
	};
}
