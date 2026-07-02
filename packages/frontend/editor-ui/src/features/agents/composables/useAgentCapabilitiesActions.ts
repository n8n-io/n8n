import { computed, type ComputedRef, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { createAgentSkill } from './useAgentApi';
import { mcpServerToNode } from './useMcpServerAdapter';
import {
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
} from '../constants';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import { normalizeAgentSkillForSave } from '../utils/agentSkill';
import type { ToolOpenTarget } from '../components/AgentCapabilitiesSection.types';
import type { AgentSkillAllowedToolOption } from '../components/AgentSkillViewer.vue';
import type {
	AgentResource,
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
	AgentSkill,
} from '../types';

/**
 * Telemetry seam for the capability actions. Each method is optional so a
 * surface that doesn't want full builder telemetry (e.g. the NDV) can pass a
 * partial / no-op adapter. Only the methods the handlers actually call live
 * here — `recordConfigEdit` is owned by the host's config-update funnel, not
 * by these handlers.
 */
export interface AgentCapabilitiesTelemetry {
	trackOpenedToolFromList?: (toolType: string) => void;
	trackOpenedSkillFromList?: (skillId: string) => void;
	trackOpenedAddSkillModal?: () => void;
	trackTriggerListChanged?: (triggers: string[]) => void;
	trackTriggerAdded?: (payload: { triggerType: string; triggers: string[] }) => void;
}

export interface UseAgentCapabilitiesActionsDeps {
	/** Local (unsaved) agent config the handlers read + mutate via `scheduleConfigUpdate`. */
	localConfig: Ref<AgentJsonConfig | null>;
	/** The agent resource — provides custom-tool bodies + the skills map. */
	agent: Ref<AgentResource | null>;
	projectId: Ref<string> | ComputedRef<string>;
	agentId: Ref<string> | ComputedRef<string>;
	/** Connected-trigger chip list, owned by the host and mutated by the trigger handlers. */
	connectedTriggers: Ref<string[]>;
	/**
	 * The host's config-update funnel. Owns autosave scheduling, identity
	 * sync, and `recordConfigEdit` telemetry — the handlers just call it with
	 * the partial update they computed.
	 */
	scheduleConfigUpdate: (updates: Partial<AgentJsonConfig>) => void;
	/**
	 * Persists an edit to an *existing* skill's body (name/description/
	 * instructions/allowedTools/references). Each host owns its own skill
	 * autosave lifecycle (the builder + NDV each run a dedicated
	 * `useAgentConfigAutosave`), so the seam is injected rather than the
	 * builder's autosave being hard-wired here. Creating a *new* skill stays in
	 * `onOpenAddSkillModal` via the shared `createAgentSkill` API call.
	 */
	scheduleSkillSave: (payload: { skillId: string; skill: AgentSkill }) => void;
	telemetry?: AgentCapabilitiesTelemetry;
}

/**
 * The set of capability-action handlers wired to `AgentCapabilitiesSection`
 * (tools, skills, tasks, triggers). Extracted from `AgentBuilderView` so a
 * second surface (the agent node's NDV) can reuse them with its own
 * config-update funnel + telemetry adapter.
 *
 * Routing-decoupled: depends only on the injected refs/callbacks, never on
 * `route`/`router`.
 */
export function useAgentCapabilitiesActions(deps: UseAgentCapabilitiesActionsDeps) {
	const {
		localConfig,
		agent,
		projectId,
		agentId,
		connectedTriggers,
		scheduleConfigUpdate,
		scheduleSkillSave,
		telemetry,
	} = deps;

	const locale = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const { showError, showMessage } = useToast();

	function onOpenAddToolModal() {
		uiStore.openModalWithData({
			name: AGENT_TOOLS_MODAL_KEY,
			data: {
				tools: localConfig.value?.tools ?? [],
				mcpServers: localConfig.value?.mcpServers ?? [],
				projectId: projectId.value,
				agentId: agentId.value,
				// The modal confirms with a single object payload (the modal-data
				// plumbing is untyped, so a signature drift here isn't caught by TS —
				// a positional handler would write `{ tools, mcpServers }` into
				// `config.tools` and fail backend validation).
				onConfirm: (payload: {
					tools?: AgentJsonToolConfig[];
					mcpServers?: AgentJsonMcpServerConfig[];
				}) =>
					scheduleConfigUpdate({
						...(payload.tools && { tools: payload.tools }),
						...(payload.mcpServers && { mcpServers: payload.mcpServers }),
					}),
			},
		});
	}

	function onOpenToolFromList(target: ToolOpenTarget | number) {
		const tools = localConfig.value?.tools ?? [];

		const toolIndex =
			typeof target === 'number'
				? target
				: tools.findIndex((tool) => {
						if (target.kind !== 'tool') return false;
						if (tool.type !== target.toolType) return false;
						if (tool.type === 'node') return tool.name === target.id;
						if (tool.type === 'workflow') return tool.workflow === target.id;
						return tool.id === target.id;
					});

		if (toolIndex >= 0) {
			const tool = tools[toolIndex];
			if (!tool) return;
			telemetry?.trackOpenedToolFromList?.(tool.type);
			const customTool =
				tool.type === 'custom' && tool.id ? agent.value?.tools?.[tool.id] : undefined;
			uiStore.openModalWithData({
				name: AGENT_TOOL_CONFIG_MODAL_KEY,
				data: {
					toolRef: tool,
					customTool,
					projectId: projectId.value,
					agentId: agentId.value,
					existingToolNames: tools
						.map((toolRef, i) =>
							i === toolIndex || toolRef.type === 'custom' ? null : toolRef.name,
						)
						.filter((name): name is string => !!name),
					onConfirm: (updatedTool: AgentJsonToolConfig) => {
						const nextTools = [...(localConfig.value?.tools ?? [])];
						nextTools[toolIndex] = updatedTool;
						scheduleConfigUpdate({ tools: nextTools });
					},
					onRemove: () => onRemoveTool(toolIndex),
				},
			});
			return;
		}

		const mcpServers = localConfig.value?.mcpServers ?? [];
		const mcpServerIndex =
			typeof target === 'number'
				? target - tools.length
				: target.kind === 'mcpServer'
					? mcpServers.findIndex((server) => server.name === target.serverName)
					: -1;
		const mcpServer = mcpServers[mcpServerIndex];
		if (!mcpServer) return;

		telemetry?.trackOpenedToolFromList?.('mcpServer');
		const preferredNodeTypeName = mcpServer.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE;
		const nodeType =
			nodeTypesStore.getNodeType(preferredNodeTypeName) ??
			nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE);
		if (!nodeType) return;

		uiStore.openModalWithData({
			name: AGENT_TOOL_CONFIG_MODAL_KEY,
			data: {
				kind: 'mcpServer',
				mcpServer,
				initialNode: mcpServerToNode(mcpServer, nodeType),
				projectId: projectId.value,
				agentId: agentId.value,
				existingToolNames: mcpServers
					.filter((_, i) => i !== mcpServerIndex)
					.map((server) => server.name),
				onConfirm: (updatedServer: AgentJsonMcpServerConfig) => {
					const nextMcpServers = [...(localConfig.value?.mcpServers ?? [])];
					nextMcpServers[mcpServerIndex] = updatedServer;
					scheduleConfigUpdate({ mcpServers: nextMcpServers });
				},
				onRemove: () => {
					const nextMcpServers = (localConfig.value?.mcpServers ?? []).filter(
						(_, i) => i !== mcpServerIndex,
					);
					scheduleConfigUpdate({ mcpServers: nextMcpServers });
				},
			},
		});
	}

	const appliedSkills = computed<Array<{ id: string; skill: AgentSkill }>>(() => {
		const refs = localConfig.value?.skills ?? [];
		const seen = new Set<string>();
		const out: Array<{ id: string; skill: AgentSkill }> = [];

		for (const skillRef of refs) {
			if (!skillRef.id || seen.has(skillRef.id)) continue;
			seen.add(skillRef.id);
			out.push({
				id: skillRef.id,
				skill: agent.value?.skills?.[skillRef.id] ?? {
					name: skillRef.id,
					description: '',
					instructions: '',
				},
			});
		}

		return out;
	});

	function onOpenSkillFromList(id: string) {
		const skill = appliedSkills.value.find((s) => s.id === id)?.skill;
		if (!skill) return;
		telemetry?.trackOpenedSkillFromList?.(id);
		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: projectId.value,
				agentId: agentId.value,
				skill,
				skillId: id,
				availableTools: configuredToolOptions(),
				onRemove: (skillId: string) => onRemoveSkill(skillId),
				onConfirm: ({ id: skillId, skill: updatedSkill }: { id?: string; skill: AgentSkill }) => {
					if (!skillId) return;
					if (agent.value?.id !== agentId.value) return;
					const sanitizedSkill = filterSkillAllowedTools(updatedSkill);
					agent.value = {
						...agent.value,
						skills: {
							...(agent.value.skills ?? {}),
							[skillId]: sanitizedSkill,
						},
					};
					const nextSkills = [...(localConfig.value?.skills ?? [])];
					const skillRefIndex = nextSkills.findIndex((skillRef) => skillRef.id === id);
					if (skillRefIndex !== -1) {
						nextSkills[skillRefIndex] = { type: 'skill', id: skillId };
						scheduleConfigUpdate({ skills: nextSkills });
					}
					scheduleSkillSave({ skillId, skill: sanitizedSkill });
				},
			},
		});
	}

	function configuredToolOptions(): AgentSkillAllowedToolOption[] {
		const tools: AgentSkillAllowedToolOption[] = [];
		for (const tool of localConfig.value?.tools ?? []) {
			if (tool.type === 'custom') {
				const name = agent.value?.tools?.[tool.id]?.descriptor.name ?? tool.id;
				if (name) {
					tools.push({ name, label: formatToolNameForDisplay(name) || name, icon: 'code' });
				}
			} else if (tool.type === 'workflow') {
				const name = tool.name ?? tool.workflow;
				tools.push({ name, label: formatToolNameForDisplay(name) || name, icon: 'workflow' });
			} else {
				tools.push({
					name: tool.name,
					label: formatToolNameForDisplay(tool.name) || tool.name,
					icon: 'globe',
				});
			}
		}
		return tools;
	}

	function configuredToolNames(): Set<string> {
		return new Set(configuredToolOptions().map((tool) => tool.name));
	}

	function filterSkillAllowedTools(skill: AgentSkill): AgentSkill {
		return normalizeAgentSkillForSave(skill, configuredToolNames());
	}

	function onRemoveTool(index: number) {
		const currentTools = localConfig.value?.tools ?? [];
		if (index < 0 || index >= currentTools.length) return;
		const nextTools = currentTools.filter((_, i) => i !== index);
		scheduleConfigUpdate({ tools: nextTools });
	}

	function onRemoveSkill(id: string) {
		const currentSkills = localConfig.value?.skills ?? [];
		const nextSkills = currentSkills.filter((skillRef) => skillRef.id !== id);
		scheduleConfigUpdate({ skills: nextSkills });
	}

	function onToggleTask(payload: { id: string; enabled: boolean }) {
		const nextTasks = (localConfig.value?.tasks ?? []).map((taskRef) =>
			taskRef.id === payload.id ? { ...taskRef, enabled: payload.enabled } : taskRef,
		);
		scheduleConfigUpdate({ tasks: nextTasks });
	}

	function onOpenAddSkillModal() {
		telemetry?.trackOpenedAddSkillModal?.();
		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: projectId.value,
				agentId: agentId.value,
				availableTools: configuredToolOptions(),
				onConfirm: ({ skill }: { id?: string; skill: AgentSkill }) => {
					void (async () => {
						const sanitizedSkill = filterSkillAllowedTools(skill);
						let created: AgentSkill;
						let versionId: string | null;
						let skillId: string;
						try {
							const result = await createAgentSkill(
								rootStore.restApiContext,
								projectId.value,
								agentId.value,
								sanitizedSkill,
							);
							skillId = result.id;
							created = result.skill;
							versionId = result.versionId;
						} catch (error) {
							showError(error, locale.baseText('agents.builder.skills.create.error'));
							return;
						}
						if (agent.value?.id !== agentId.value) return;
						agent.value = {
							...agent.value,
							versionId,
							skills: {
								...(agent.value.skills ?? {}),
								[skillId]: created,
							},
						};
						scheduleConfigUpdate({
							skills: [...(localConfig.value?.skills ?? []), { type: 'skill', id: skillId }],
						});
						showMessage({
							title: locale.baseText('agents.builder.skills.added'),
							type: 'success',
						});
					})();
				},
			},
		});
	}

	function onQuickActionAddTool(tools: AgentJsonToolConfig[]) {
		scheduleConfigUpdate({ tools });
	}

	function onQuickActionAddMcpServers(mcpServers: AgentJsonMcpServerConfig[]) {
		scheduleConfigUpdate({ mcpServers });
	}

	function onConnectedTriggersUpdate(triggers: string[]) {
		connectedTriggers.value = triggers;
		telemetry?.trackTriggerListChanged?.(triggers);
	}

	function onTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
		connectedTriggers.value = payload.triggers;
		telemetry?.trackTriggerAdded?.(payload);
	}

	return {
		appliedSkills,
		onOpenAddToolModal,
		onOpenToolFromList,
		onRemoveTool,
		onQuickActionAddTool,
		onQuickActionAddMcpServers,
		onOpenAddSkillModal,
		onOpenSkillFromList,
		onRemoveSkill,
		onToggleTask,
		onConnectedTriggersUpdate,
		onTriggerAdded,
	};
}
