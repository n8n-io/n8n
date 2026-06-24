import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentConfigFingerprint, AgentTelemetryStatus } from './agentTelemetry.utils';

export type AgentChatMode = 'build' | 'test';
export type AgentCreateSource = 'button' | 'dropdown' | 'card';
export type AgentConfigPart =
	| 'instructions'
	| 'model'
	| 'memory'
	| 'tools'
	| 'skills'
	| 'triggers'
	| 'subAgents'
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

	function trackClickedNewAgent(source: AgentCreateSource) {
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

	function trackAddedTasks(params: {
		agentId: string;
		taskAdded: string;
		tasks: string[];
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		safeTrack('User added tasks to agent', {
			agent_id: params.agentId,
			task_added: params.taskAdded,
			tasks: params.tasks,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackRemovedTasks(params: {
		agentId: string;
		taskRemoved: string;
		tasks: string[];
		configVersion: string;
		status: AgentTelemetryStatus;
	}) {
		safeTrack('User removed tasks from agent', {
			agent_id: params.agentId,
			task_removed: params.taskRemoved,
			tasks: params.tasks,
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

	function trackOpenedToolFromList(params: { agentId: string; toolType: string }) {
		safeTrack('User opened agent tool', {
			agent_id: params.agentId,
			tool_type: params.toolType,
			...common(),
		});
	}

	function trackOpenedSkillFromList(params: { agentId: string; skillId: string }) {
		safeTrack('User opened agent skill', {
			agent_id: params.agentId,
			skill_id: params.skillId,
			...common(),
		});
	}

	function trackOpenedAddSkillModal(params: { agentId: string }) {
		safeTrack('User opened add skill modal', {
			agent_id: params.agentId,
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
		trackAddedTasks,
		trackRemovedTasks,
		trackPublishedAgent,
		trackUnpublishedAgent,
		trackOpenedToolFromList,
		trackOpenedSkillFromList,
		trackOpenedAddSkillModal,
	};
}
