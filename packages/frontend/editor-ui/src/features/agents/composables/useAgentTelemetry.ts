import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentConfigFingerprint, AgentTelemetryStatus } from './agentTelemetry.utils';

export type AgentCreateSource = 'button' | 'dropdown' | 'card';

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

	function trackClickedNewAgent(source: AgentCreateSource, agentId: string) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_AGENT, {
			source,
			agent_id: agentId,
			...common(),
		});
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

	function trackStartedChannelSetup(params: { agentId: string; channelType: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_STARTED_AGENT_CHANNEL_SETUP, {
			agent_id: params.agentId,
			channel_type: params.channelType,
			...common(),
		});
	}

	function trackClosedChannelSetup(params: {
		agentId: string;
		channelType: string;
		completed: boolean;
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_CLOSED_AGENT_CHANNEL_SETUP, {
			agent_id: params.agentId,
			channel_type: params.channelType,
			completed: params.completed,
			...common(),
		});
	}

	function trackFailedToConnectChannel(params: {
		agentId: string;
		channelType: string;
		stage: 'persist' | 'before_save' | 'connect';
		conflict: boolean;
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_FAILED_TO_CONNECT_AGENT_CHANNEL, {
			agent_id: params.agentId,
			channel_type: params.channelType,
			stage: params.stage,
			conflict: params.conflict,
			...common(),
		});
	}

	function trackCheckedTeamsCredential(params: {
		agentId: string;
		trigger: 'auto' | 'recheck';
		status: 'ok' | 'failed';
		reason?: InferTelemetryProps<
			typeof TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL
		>['reason'];
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL, {
			agent_id: params.agentId,
			trigger: params.trigger,
			status: params.status,
			...(params.reason ? { reason: params.reason } : {}),
			...common(),
		});
	}

	function trackClickedDeployToAzure(params: { agentId: string }) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_CLICKED_DEPLOY_TO_AZURE_FOR_TEAMS_CHANNEL, {
			agent_id: params.agentId,
			...common(),
		});
	}

	function trackDownloadedTeamsAppPackage(params: {
		agentId: string;
		status: 'success' | 'error';
	}) {
		safeTrack(TELEMETRY_EVENT.AGENTS.USER_DOWNLOADED_TEAMS_APP_PACKAGE, {
			agent_id: params.agentId,
			status: params.status,
			...common(),
		});
	}

	function trackDuplicatedAgent(params: {
		sourceAgentId: string;
		agentId: string;
		projectId: string;
	}) {
		try {
			telemetry.track('User duplicated agent', {
				source_agent_id: params.sourceAgentId,
				agent_id: params.agentId,
				project_id: params.projectId,
				...common(),
			});
		} catch {
			// Swallow — telemetry must not break user-facing flows.
		}
	}

	return {
		trackClickedNewAgent,
		trackSubmittedMessage,
		trackAddedTrigger,
		trackOpenedToolFromList,
		trackOpenedSkillFromList,
		trackOpenedAddSkillModal,
		trackImportedSkill,
		trackDuplicatedAgent,
		trackStartedChannelSetup,
		trackClosedChannelSetup,
		trackFailedToConnectChannel,
		trackCheckedTeamsCredential,
		trackClickedDeployToAzure,
		trackDownloadedTeamsAppPackage,
	};
}
