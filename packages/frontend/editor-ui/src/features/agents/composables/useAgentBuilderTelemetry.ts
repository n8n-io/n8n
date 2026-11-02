import { type Ref } from 'vue';
import { isDraftIntegration, type AgentIntegrationStatusEntry } from '@n8n/api-types';
import {
	buildAgentConfigFingerprint,
	deriveAgentStatus,
	type AgentTelemetryStatus,
} from './agentTelemetry.utils';
import { syncAgentIntegrationStatusCache } from './useAgentIntegrationStatus';
import { useAgentTelemetry, type KnowledgeUploadClientFailureReason } from './useAgentTelemetry';
import type { AgentResource, AgentJsonConfig } from '../types';

/**
 * All agent-builder telemetry state and emission lives here so the view stays
 * focused on user-facing behavior. The view hands over its reactive refs and
 * then only calls narrow `track*` methods at event sites.
 */
export interface AgentBuilderTelemetryDeps {
	agentId: Ref<string>;
	projectId: Ref<string>;
	agent: Ref<AgentResource | null>;
	/** Local (unsaved) config — the fingerprint source for emitted events. */
	localConfig: Ref<AgentJsonConfig | null>;
}

interface EditSnapshot {
	agentId: string;
	status: AgentTelemetryStatus;
	config: AgentJsonConfig | null;
}

/**
 * The config says which channels exist, not whether they are running — only the
 * status endpoint knows that. A published agent's channels are therefore seeded
 * as `starting` rather than `connected`: claiming connected here is what let a
 * channel that never started show a green dot until something refetched.
 */
function integrationStatusEntriesFromConfig(
	config: AgentJsonConfig | null,
	knownTriggerTypes: readonly string[],
	isPublished: boolean,
): Array<AgentIntegrationStatusEntry & { credentialId: string }> {
	const knownTypes = new Set(knownTriggerTypes);
	const entries: Array<AgentIntegrationStatusEntry & { credentialId: string }> = [];

	for (const integration of config?.integrations ?? []) {
		if (!knownTypes.has(integration.type)) continue;
		// Settings and approval ride along so a config seed does not blank what the
		// status endpoint reported. The edit modal saves from that cache.
		entries.push({
			type: integration.type,
			credentialId: integration.credentialId,
			...('settings' in integration ? { settings: integration.settings } : {}),
			...('approval' in integration && integration.approval
				? { approval: integration.approval }
				: {}),
			status: isPublished ? 'starting' : 'configured',
		});
	}

	return entries;
}

export function useAgentBuilderTelemetry(deps: AgentBuilderTelemetryDeps) {
	const agentTelemetry = useAgentTelemetry();

	function snapshot(): EditSnapshot {
		return {
			agentId: deps.agentId.value,
			status: deriveAgentStatus(deps.agent.value),
			config: deps.localConfig.value,
		};
	}

	/**
	 * Compute the fingerprint before each event. Ignore failures so telemetry
	 * does not interrupt editing. Track calls also handle errors in `useAgentTelemetry`.
	 */
	function withFingerprint(
		config: AgentJsonConfig | null,
		triggers: string[],
		emit: (configVersion: string, configuredTriggers: string[]) => void,
		additionalConfiguredTriggers: string[] = [],
	) {
		void (async () => {
			try {
				const fp = await buildAgentConfigFingerprint(
					config,
					triggers,
					additionalConfiguredTriggers,
				);
				emit(fp.config_version, fp.triggers);
			} catch {
				// Swallow — telemetry is best-effort.
			}
		})();
	}

	function trackTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
		const s = snapshot();
		withFingerprint(
			s.config,
			payload.triggers,
			(configVersion, configuredTriggers) => {
				agentTelemetry.trackAddedTrigger({
					agentId: s.agentId,
					triggerType: payload.triggerType,
					triggers: configuredTriggers,
					configVersion,
					status: s.status,
				});
			},
			[payload.triggerType],
		);
	}

	function trackTriggerRemoved(payload: { triggerType: string; triggers: string[] }) {
		const s = snapshot();
		withFingerprint(s.config, payload.triggers, (configVersion, configuredTriggers) => {
			agentTelemetry.trackRemovedTrigger({
				agentId: s.agentId,
				triggerType: payload.triggerType,
				triggers: configuredTriggers,
				configVersion,
				status: s.status,
			});
		});
	}

	/**
	 * Eagerly derive configured trigger types so telemetry fingerprints are
	 * accurate even if the user never opens the Triggers section of the
	 * settings sidebar. Integrations are already part of the fetched agent
	 * config, so this does not need a separate integration-status request.
	 */
	async function fetchInitialTriggersBaseline(
		knownTriggerTypes: readonly string[],
	): Promise<string[] | null> {
		const integrations = integrationStatusEntriesFromConfig(
			deps.localConfig.value,
			knownTriggerTypes,
			!!deps.agent.value?.activeVersionId,
		);
		const configured = integrations.map((integration) => integration.type).sort();
		const configuredIntegrations = integrations.filter(
			(integration) => !isDraftIntegration(integration),
		);
		syncAgentIntegrationStatusCache(
			deps.projectId.value,
			deps.agentId.value,
			knownTriggerTypes,
			configuredIntegrations,
			integrations.filter((integration) => isDraftIntegration(integration)),
		);
		return configured;
	}

	function trackOpenedToolFromList(toolType: string) {
		agentTelemetry.trackOpenedToolFromList({ agentId: deps.agentId.value, toolType });
	}

	function trackOpenedSkillFromList(skillId: string) {
		agentTelemetry.trackOpenedSkillFromList({ agentId: deps.agentId.value, skillId });
	}

	function trackOpenedAddSkillModal() {
		agentTelemetry.trackOpenedAddSkillModal({ agentId: deps.agentId.value });
	}

	function trackOpenedKnowledgeTab() {
		agentTelemetry.trackOpenedKnowledgeTab({ agentId: deps.agentId.value });
	}

	function trackStartedFileUpload(fileCount: number) {
		agentTelemetry.trackStartedAddingKnowledge({
			agentId: deps.agentId.value,
			kind: 'file',
			fileCount,
		});
	}

	function trackStartedVectorStoreSetup() {
		agentTelemetry.trackStartedAddingKnowledge({
			agentId: deps.agentId.value,
			kind: 'vector_store',
		});
	}

	function trackRejectedFileUpload(reason: KnowledgeUploadClientFailureReason, fileCount: number) {
		agentTelemetry.trackFailedKnowledgeUpload({ agentId: deps.agentId.value, reason, fileCount });
	}

	return {
		trackTriggerAdded,
		trackTriggerRemoved,
		fetchInitialTriggersBaseline,
		trackOpenedToolFromList,
		trackOpenedSkillFromList,
		trackOpenedAddSkillModal,
		trackOpenedKnowledgeTab,
		trackStartedFileUpload,
		trackStartedVectorStoreSetup,
		trackRejectedFileUpload,
	};
}
