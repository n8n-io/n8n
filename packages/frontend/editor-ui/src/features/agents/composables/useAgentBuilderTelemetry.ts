import { type Ref } from 'vue';
import { isDraftIntegration, type AgentIntegrationStatusEntry } from '@n8n/api-types';
import {
	buildAgentConfigFingerprint,
	deriveAgentStatus,
	type AgentTelemetryStatus,
} from './agentTelemetry.utils';
import { syncAgentIntegrationStatusCache } from './useAgentIntegrationStatus';
import { useAgentTelemetry } from './useAgentTelemetry';
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
	connectedTriggers: Ref<string[]>;
}

interface EditSnapshot {
	agentId: string;
	status: AgentTelemetryStatus;
	config: AgentJsonConfig | null;
	connectedTriggers: string[];
}

function integrationStatusEntriesFromConfig(
	config: AgentJsonConfig | null,
	knownTriggerTypes: readonly string[],
): Array<AgentIntegrationStatusEntry & { credentialId: string }> {
	const knownTypes = new Set(knownTriggerTypes);
	const entries: Array<AgentIntegrationStatusEntry & { credentialId: string }> = [];

	for (const integration of config?.integrations ?? []) {
		if (!knownTypes.has(integration.type)) continue;
		entries.push({ type: integration.type, credentialId: integration.credentialId });
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
			connectedTriggers: deps.connectedTriggers.value,
		};
	}

	/**
	 * Compute the agent's `config_version` fingerprint asynchronously, then hand
	 * it to `emit`. Centralizes the async-IIFE + try/catch boilerplate that
	 * every fingerprint-bearing event would otherwise duplicate. `crypto.subtle`
	 * can throw in insecure contexts, so failures are swallowed — individual
	 * track calls are already wrapped inside `useAgentTelemetry`.
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
			deps.agent.value?.activeVersionId ? 'connected' : 'configured',
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

	return {
		trackTriggerAdded,
		fetchInitialTriggersBaseline,
		trackOpenedToolFromList,
		trackOpenedSkillFromList,
		trackOpenedAddSkillModal,
	};
}
