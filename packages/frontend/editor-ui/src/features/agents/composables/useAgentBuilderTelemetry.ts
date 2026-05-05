import { ref, type Ref } from 'vue';
import isEqual from 'lodash/isEqual';
import {
	isAgentCredentialIntegration,
	isAgentScheduleIntegration,
	type AgentIntegrationStatusEntry,
} from '@n8n/api-types';
import {
	buildAgentConfigFingerprint,
	deriveAgentStatus,
	skillIdentifiersFromConfig,
	toolIdentifiersFromConfig,
	type AgentTelemetryStatus,
} from './agentTelemetry.utils';
import { syncAgentIntegrationStatusCache } from './useAgentIntegrationStatus';
import { useAgentTelemetry, type AgentConfigPart } from './useAgentTelemetry';
import type { AgentResource, AgentJsonConfig } from '../types';

/**
 * All agent-builder telemetry state and emission lives here so the view stays
 * focused on user-facing behavior. The view hands over its reactive refs and
 * then only calls narrow `track*`/`record*` methods at event sites.
 */
export interface AgentBuilderTelemetryDeps {
	agentId: Ref<string>;
	projectId: Ref<string>;
	agent: Ref<AgentResource | null>;
	/** Local (unsaved) config — used for diffing incoming edits. */
	localConfig: Ref<AgentJsonConfig | null>;
	/** Server-saved config — used as the fingerprint source for flushed edits. */
	savedConfig: Ref<AgentJsonConfig | null>;
	connectedTriggers: Ref<string[]>;
}

interface EditSnapshot {
	agentId: string;
	status: AgentTelemetryStatus;
	config: AgentJsonConfig | null;
	connectedTriggers: string[];
}

// Config keys that map directly to a same-named telemetry part. `credential`
// is handled separately (maps to `model`) because a credential change is
// conceptually part of a model selection — the sidebar emits
// `{ model, credential }` together.
const TRACKED_CONFIG_KEYS = [
	'instructions',
	'model',
	'memory',
	'tools',
	'skills',
	'name',
	'description',
] as const satisfies ReadonlyArray<keyof AgentJsonConfig & AgentConfigPart>;

/**
 * Returns every telemetry part whose value actually changed between `current`
 * and `updates`. A single update payload can touch multiple parts (e.g. the
 * JSON editor broadcasts the whole config, or model-change emits
 * `{ model, credential }`), and we want one event per genuinely-changed part
 * rather than coalescing to the first match.
 */
function deriveChangedParts(
	updates: Partial<AgentJsonConfig>,
	current: AgentJsonConfig | null,
): AgentConfigPart[] {
	const parts = new Set<AgentConfigPart>();
	const changed = <K extends keyof AgentJsonConfig>(key: K) =>
		key in updates && (!current || !isEqual(current[key], updates[key]));

	for (const key of TRACKED_CONFIG_KEYS) {
		if (changed(key)) parts.add(key);
	}
	if (changed('credential')) parts.add('model');
	return Array.from(parts);
}

function integrationStatusEntriesFromConfig(
	config: AgentJsonConfig | null,
	knownTriggerTypes: readonly string[],
): AgentIntegrationStatusEntry[] {
	const knownTypes = new Set(knownTriggerTypes);
	const entries: AgentIntegrationStatusEntry[] = [];

	for (const integration of config?.integrations ?? []) {
		if (!knownTypes.has(integration.type)) continue;

		if (isAgentScheduleIntegration(integration)) {
			if (integration.cronExpression.trim() !== '') {
				entries.push({ type: integration.type });
			}
			continue;
		}

		if (isAgentCredentialIntegration(integration)) {
			entries.push({ type: integration.type, credentialId: integration.credentialId });
		}
	}

	return entries;
}

export function useAgentBuilderTelemetry(deps: AgentBuilderTelemetryDeps) {
	const agentTelemetry = useAgentTelemetry();

	// Parts accumulated between autosave flushes. `recordConfigEdit` adds to
	// this set; `flushConfigEdits` drains it after a successful save and emits
	// one `User edited agent config` event per part. Edits that never persist
	// (save error, agent deletion, etc.) are dropped via `discardConfigEdits`.
	const pendingEditedConfigParts = new Set<AgentConfigPart>();

	// Baseline used to detect real trigger changes. The integrations panel emits
	// its current connected list whenever it runs `fetchStatus()`, which includes
	// the harmless panel-mount refresh. We only want to fire `User edited agent
	// config` (part: 'triggers') when the list actually differs.
	const triggersBaseline = ref<string[]>([]);

	// Snapshot of tool identifiers at last observed config state. Used by
	// `trackToolsAdded` to compute the diff against the new config.
	let previousTools: string[] = [];

	// Same idea, parallel for skills.
	let previousSkills: string[] = [];

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
		emit: (configVersion: string) => void,
	) {
		void (async () => {
			try {
				const fp = await buildAgentConfigFingerprint(config, triggers);
				emit(fp.config_version);
			} catch {
				// Swallow — telemetry is best-effort.
			}
		})();
	}

	function emitEditedEvents(parts: AgentConfigPart[], s: EditSnapshot) {
		if (parts.length === 0) return;
		withFingerprint(s.config, s.connectedTriggers, (configVersion) => {
			for (const part of parts) {
				agentTelemetry.trackEditedConfig({
					agentId: s.agentId,
					part,
					configVersion,
					status: s.status,
				});
			}
		});
	}

	function recordConfigEdit(updates: Partial<AgentJsonConfig>) {
		const parts = deriveChangedParts(updates, deps.localConfig.value);
		for (const part of parts) pendingEditedConfigParts.add(part);
	}

	/**
	 * Emit accumulated config-edit events after a successful save. Uses the
	 * server-saved config so `config_version` reflects what was actually
	 * persisted, not a mid-debounce local snapshot.
	 */
	function flushConfigEdits() {
		if (pendingEditedConfigParts.size === 0) return;
		const parts = Array.from(pendingEditedConfigParts);
		pendingEditedConfigParts.clear();
		emitEditedEvents(parts, {
			agentId: deps.agentId.value,
			status: deriveAgentStatus(deps.agent.value),
			config: deps.savedConfig.value,
			connectedTriggers: deps.connectedTriggers.value,
		});
	}

	function trackTriggerListChanged(list: string[]) {
		const changed = !isEqual(triggersBaseline.value, list);
		triggersBaseline.value = list;
		if (!changed) return;
		emitEditedEvents(['triggers'], snapshot());
	}

	function trackTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
		const s = snapshot();
		withFingerprint(s.config, payload.triggers, (configVersion) => {
			agentTelemetry.trackAddedTrigger({
				agentId: s.agentId,
				triggerType: payload.triggerType,
				triggers: payload.triggers,
				configVersion,
				status: s.status,
			});
		});
	}

	/** Capture the current tool list as the baseline for future `trackToolsAdded` diffs. */
	function captureToolsBaseline() {
		previousTools = toolIdentifiersFromConfig(deps.savedConfig.value);
	}

	/**
	 * Diff the current saved tool list against the last observed baseline and
	 * emit `User added tools to agent` for each newly added tool. Updates the
	 * baseline so the next call only reports further additions.
	 */
	function trackToolsAdded() {
		const current = toolIdentifiersFromConfig(deps.savedConfig.value);
		const added = current.filter((t) => !previousTools.includes(t));
		previousTools = current;
		if (added.length === 0) return;
		const s = snapshot();
		withFingerprint(s.config, s.connectedTriggers, (configVersion) => {
			for (const toolAdded of added) {
				agentTelemetry.trackAddedTools({
					agentId: s.agentId,
					toolAdded,
					tools: current,
					configVersion,
					status: s.status,
				});
			}
		});
	}

	function captureSkillsBaseline() {
		previousSkills = skillIdentifiersFromConfig(deps.savedConfig.value);
	}

	function trackSkillsAdded() {
		const current = skillIdentifiersFromConfig(deps.savedConfig.value);
		const added = current.filter((s) => !previousSkills.includes(s));
		previousSkills = current;
		if (added.length === 0) return;
		const s = snapshot();
		withFingerprint(s.config, s.connectedTriggers, (configVersion) => {
			for (const skillAdded of added) {
				agentTelemetry.trackAddedSkills({
					agentId: s.agentId,
					skillAdded,
					skills: current,
					configVersion,
					status: s.status,
				});
			}
		});
	}

	/**
	 * Eagerly derive connected trigger types so telemetry fingerprints are
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
		const connected = integrations.map((integration) => integration.type).sort();
		syncAgentIntegrationStatusCache(
			deps.projectId.value,
			deps.agentId.value,
			knownTriggerTypes,
			integrations,
		);
		triggersBaseline.value = connected;
		return connected;
	}

	/** Reset all per-agent telemetry state when switching agents. */
	function resetForAgentSwitch() {
		pendingEditedConfigParts.clear();
		triggersBaseline.value = [];
		previousTools = [];
		previousSkills = [];
	}

	return {
		recordConfigEdit,
		flushConfigEdits,
		trackTriggerListChanged,
		trackTriggerAdded,
		trackToolsAdded,
		trackSkillsAdded,
		captureToolsBaseline,
		captureSkillsBaseline,
		fetchInitialTriggersBaseline,
		resetForAgentSwitch,
	};
}
