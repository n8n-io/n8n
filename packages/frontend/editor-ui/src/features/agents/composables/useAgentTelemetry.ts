import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentConfigFingerprint, AgentTelemetryStatus } from './agentTelemetry.utils';

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
	| 'description'
	| 'vectorStores';

export function useAgentTelemetry() {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const common = () => ({ session_id: rootStore.pushRef });

	// Telemetry is best-effort: every track call is wrapped so a RudderStack
	// failure can never surface to a caller (and never takes down a critical
	// path like publish or save).
	function safeTrack<T extends TelemetryEventDef>(event: T, props: InferTelemetryProps<T>) {
		try {
			telemetry.track(event, props);
		} catch {
			// Swallow — telemetry must not break user-facing flows.
		}
	}

	function trackClickedNewAgent(source: AgentCreateSource) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, { source, ...common() });
	}

	function trackSubmittedMessage(params: {
		agentId: string;
		status: AgentTelemetryStatus;
		agentConfig: AgentConfigFingerprint;
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_SUBMITTED_MESSAGE_TO_AGENT, {
			agent_id: params.agentId,
			mode: 'test', // Constant dimension kept for warehouse-schema stability.
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_EDITED_AGENT_CONFIG, {
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_ADDED_TRIGGER_TO_AGENT, {
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_ADDED_TOOLS_TO_AGENT, {
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_ADDED_SKILLS_TO_AGENT, {
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_ADDED_TASKS_TO_AGENT, {
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
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_REMOVED_TASKS_FROM_AGENT, {
			agent_id: params.agentId,
			task_removed: params.taskRemoved,
			tasks: params.tasks,
			config_version: params.configVersion,
			status: params.status,
			...common(),
		});
	}

	function trackPublishedAgent(params: { agentId: string; configVersion: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT, {
			agent_id: params.agentId,
			config_version: params.configVersion,
			status: 'production' as const,
			...common(),
		});
	}

	function trackUnpublishedAgent(params: { agentId: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_UNPUBLISHED_AGENT, {
			agent_id: params.agentId,
			status: 'draft' as const,
			...common(),
		});
	}

	function trackOpenedToolFromList(params: { agentId: string; toolType: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_TOOL, {
			agent_id: params.agentId,
			tool_type: params.toolType,
			...common(),
		});
	}

	function trackOpenedSkillFromList(params: { agentId: string; skillId: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_SKILL, {
			agent_id: params.agentId,
			skill_id: params.skillId,
			...common(),
		});
	}

	function trackOpenedAddSkillModal(params: { agentId: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_OPENED_ADD_SKILL_MODAL, {
			agent_id: params.agentId,
			...common(),
		});
	}

	function trackImportedSkill(params: {
		agentId: string;
		source: 'skill_file' | 'folder';
		status: 'success' | 'error';
		referenceCount?: number;
		error?: string;
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_IMPORTED_AGENT_SKILL, {
			agent_id: params.agentId,
			source: params.source,
			status: params.status,
			reference_count: params.referenceCount ?? 0,
			...(params.error ? { error: params.error } : {}),
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
		trackImportedSkill,
	};
}
