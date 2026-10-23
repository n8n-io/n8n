import { computed, type ComputedRef, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	skillNameKey,
	type AgentConfigValidationIssue,
	type AgentSkillAvailability,
	type SkillCreateMethod,
	type SkillDetail,
	type SkillListItem,
	type SkillNewNameQueryDto,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { createAgentSkill, getHubSkill, getNewSkillName } from './useAgentApi';
import { useAgentProjectBreadcrumb } from './useAgentProjectBreadcrumb';
import { mcpServerToNode } from './useMcpServerAdapter';
import {
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
} from '../constants';
import { isSkillNameTakenError, normalizeAgentSkillForSave } from '../utils/agentSkill';
import type { ToolOpenTarget, ToolPickerMode } from '../components/AgentCapabilitiesSection.types';
import type { AgentSkillConfirmResult } from '../components/AgentSkillModal.vue';
import type {
	AgentResource,
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
	AgentSkill,
} from '../types';

/**
 * Telemetry seam for the capability actions.
 */
export interface AgentCapabilitiesTelemetry {
	trackOpenedToolFromList?: (toolType: string) => void;
	trackOpenedSkillFromList?: (skillId: string) => void;
	trackOpenedAddSkillModal?: () => void;
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
	 * Unused when `localSkills` is provided.
	 */
	scheduleSkillSave: (payload: {
		skillId: string;
		skill: AgentSkill;
		availableTo?: AgentSkillAvailability;
	}) => void;
	/**
	 * Skill store for hosts whose bodies live outside an agent entity — inline
	 * agents keep them in the node parameter. `bodies` is where the handlers
	 * look up a ref's body, and create/update persist through these callbacks,
	 * each covering body + ref in a single host-owned write. Removal stays on
	 * `scheduleConfigUpdate`: it only drops the ref, and the host's write
	 * funnel prunes the orphaned body.
	 */
	localSkills?: {
		bodies: ComputedRef<Record<string, AgentSkill>>;
		createSkill: (skill: AgentSkill) => void;
		updateSkill: (skillId: string, skill: AgentSkill) => void;
	};
	/**
	 * Whether the host's agent can honor tool approvals. Inline agents pass
	 * false: approval suspends the run for a human, and workflow executions
	 * don't support suspend/resume — the config modals hide the toggle.
	 */
	supportsToolApproval?: boolean;
	/**
	 * Creates the agent row if the host is still showing an unsaved agent, so a
	 * handler that calls an agent-scoped API has something to call it against.
	 * Hosts whose agent always exists omit it.
	 */
	ensureAgentPersisted?: () => Promise<void>;
	flushConfigSave?: () => Promise<unknown>;
	/**
	 * Flushes pending agent edits before an API mutation that also writes the
	 * agent config. This prevents the mutation from advancing the config hash
	 * ahead of a queued config save.
	 */
	beforeAgentMutation?: () => Promise<void>;
	/**
	 * Reloads agent-owned state after an API mutation that writes both a sidecar
	 * resource and the agent config. The reload updates the config hash without
	 * scheduling a duplicate config write.
	 */
	refreshAgentAfterMutation?: (projectId: string, agentId: string) => Promise<boolean>;
	validationIssues?: Ref<AgentConfigValidationIssue[]> | ComputedRef<AgentConfigValidationIssue[]>;
	telemetry?: AgentCapabilitiesTelemetry;
}

/**
 * The set of capability-action handlers wired to `AgentCapabilitiesSection`
 * (tools, skills, tasks, triggers). Extracted from `AgentBuilderView` so a
 * second surface (the agent node's NDV) can reuse them with its own
 * config-update funnel + telemetry adapter.
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
		localSkills,
		supportsToolApproval,
		ensureAgentPersisted,
		flushConfigSave,
		beforeAgentMutation,
		refreshAgentAfterMutation,
		validationIssues,
		telemetry,
	} = deps;

	const locale = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const rbacStore = useRBACStore();
	const settingsStore = useSettingsStore();
	const { showError, showMessage } = useToast();
	const { projectName } = useAgentProjectBreadcrumb(computed(() => projectId.value));

	const hubSkillsEnabled = computed(
		() => !localSkills && settingsStore.moduleSettings.agents?.skillsHubEnabled === true,
	);

	function onOpenAddToolModal(mode: ToolPickerMode = 'tools') {
		// Capture the target at open time: a confirm landing after an agent/node
		// switch must not write the old agent's tool list into the new one.
		const targetAgentId = agentId.value;

		uiStore.openModalWithData({
			name: AGENT_TOOLS_MODAL_KEY,
			data: {
				mode,
				tools: localConfig.value?.tools ?? [],
				mcpServers: localConfig.value?.mcpServers ?? [],
				projectId: projectId.value,
				agentId: targetAgentId,
				supportsToolApproval,
				onConfirm: (payload: {
					tools?: AgentJsonToolConfig[];
					mcpServers?: AgentJsonMcpServerConfig[];
				}) => {
					if (agentId.value !== targetAgentId) return;
					scheduleConfigUpdate({
						...(payload.tools && { tools: payload.tools }),
						...(payload.mcpServers && { mcpServers: payload.mcpServers }),
					});
				},
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

		// A numeric target past the tools array addresses an MCP server (hosts
		// emit offset indices for the combined list) — fall through to the MCP
		// section below instead of treating it as a missing tool.
		const tool = toolIndex >= 0 ? tools[toolIndex] : undefined;
		if (tool) {
			const customTool =
				tool.type === 'custom' && tool.id ? agent.value?.tools?.[tool.id] : undefined;

			telemetry?.trackOpenedToolFromList?.(tool.type);

			uiStore.openModalWithData({
				name: AGENT_TOOL_CONFIG_MODAL_KEY,
				data: {
					toolRef: tool,
					customTool,
					projectId: projectId.value,
					agentId: agentId.value,
					supportsToolApproval,
					validationIssues: validationIssues?.value.filter(
						(issue) => issue.capability.kind === 'tool' && issue.capability.index === toolIndex,
					),
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
					onRemove: () => {
						if (!localConfig.value?.tools?.[toolIndex]) return;
						onRemoveTool(toolIndex);
					},
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

		if (mcpServer.metadata?.nodeTypeName) {
			const targetAgentId = agentId.value;
			telemetry?.trackOpenedToolFromList?.('mcpServer');
			uiStore.openModalWithData({
				name: AGENT_TOOL_CONFIG_MODAL_KEY,
				data: {
					kind: 'registryMcpServer',
					mcpServer,
					projectId: projectId.value,
					supportsToolApproval,
					existingToolNames: mcpServers
						.filter((_, index) => index !== mcpServerIndex)
						.map((server) => server.name),
					onConfirm: (updatedServer: AgentJsonMcpServerConfig) => {
						if (agentId.value !== targetAgentId) return;
						const nextMcpServers = [...(localConfig.value?.mcpServers ?? [])];
						nextMcpServers[mcpServerIndex] = updatedServer;
						scheduleConfigUpdate({ mcpServers: nextMcpServers });
					},
					onRemove: () => {
						if (agentId.value !== targetAgentId) return;
						const nextMcpServers = (localConfig.value?.mcpServers ?? []).filter(
							(_, index) => index !== mcpServerIndex,
						);
						scheduleConfigUpdate({ mcpServers: nextMcpServers });
					},
				},
			});
			return;
		}

		const preferredNodeTypeName = mcpServer.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE;
		const nodeType =
			nodeTypesStore.getNodeType(preferredNodeTypeName) ??
			nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE);
		if (!nodeType) return;

		telemetry?.trackOpenedToolFromList?.('mcpServer');

		uiStore.openModalWithData({
			name: AGENT_TOOL_CONFIG_MODAL_KEY,
			data: {
				kind: 'mcpServer',
				mcpServer,
				initialNode: mcpServerToNode(mcpServer, nodeType),
				projectId: projectId.value,
				agentId: agentId.value,
				supportsToolApproval,
				existingToolNames: mcpServers
					.filter((_, i) => i !== mcpServerIndex)
					.map((server) => server.name),
				onConfirm: (updatedServer: AgentJsonMcpServerConfig) => {
					const nextMcpServers = [...(localConfig.value?.mcpServers ?? [])];
					nextMcpServers[mcpServerIndex] = updatedServer;
					scheduleConfigUpdate({ mcpServers: nextMcpServers });
				},
				onRemove: () => onRemoveTool((localConfig.value?.tools ?? []).length + mcpServerIndex),
			},
		});
	}

	const appliedSkills = computed<Array<{ id: string; skill: AgentSkill }>>(() => {
		// Inline hosts read refs from unvalidated node-parameter JSON: tolerate a
		// non-array `skills`, skip malformed refs, and resolve bodies by own key
		// only so ids like "constructor" can't surface prototype members.
		const rawRefs = localConfig.value?.skills;
		const refs = Array.isArray(rawRefs) ? rawRefs : [];
		const bodies = localSkills?.bodies.value ?? agent.value?.skills ?? {};
		const seen = new Set<string>();
		const out: Array<{ id: string; skill: AgentSkill }> = [];

		for (const skillRef of refs) {
			if (typeof skillRef?.id !== 'string' || !skillRef.id || seen.has(skillRef.id)) continue;
			seen.add(skillRef.id);
			out.push({
				id: skillRef.id,
				skill: (Object.hasOwn(bodies, skillRef.id) ? bodies[skillRef.id] : undefined) ?? {
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

		// Self-address the modal to the agent it was opened for (like the add
		// modals above): a confirm or remove landing after an agent switch must
		// not write onto the newly active agent.
		const targetAgentId = agentId.value;

		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: projectId.value,
				agentId: targetAgentId,
				skill,
				skillId: id,
				existingSkillNames: appliedSkillNames(id),
				hubSkillsEnabled: hubSkillsEnabled.value,
				outdated: hubSkillsEnabled.value && (agent.value?.outdatedSkillIds ?? []).includes(id),
				projectLabel: projectName.value ?? undefined,
				canCreateInstanceSkills: rbacStore.hasScope('skill:create'),
				onUseLatestVersion: (skillId: string) => {
					if (agentId.value !== targetAgentId) return;
					void useLatestSkillVersion(skillId);
				},
				onRemove: (skillId: string) => {
					if (agentId.value !== targetAgentId) return;
					onRemoveSkill(skillId);
				},
				onConfirm: ({
					id: skillId,
					skill: updatedSkill,
					availableTo,
				}: {
					id?: string;
					skill: AgentSkill;
					availableTo?: AgentSkillAvailability;
				}) => {
					if (!skillId) return;
					if (agentId.value !== targetAgentId) return;
					const sanitizedSkill = normalizeAgentSkillForSave(updatedSkill);

					if (localSkills) {
						if (hasDuplicateSkillName(sanitizedSkill.name, skillId)) {
							showDuplicateSkillNameError(sanitizedSkill.name);
							return;
						}
						localSkills.updateSkill(skillId, sanitizedSkill);
						return;
					}

					if (agent.value?.id !== targetAgentId) return;
					agent.value = {
						...agent.value,
						skills: {
							...(agent.value.skills ?? {}),
							[skillId]: sanitizedSkill,
						},
					};
					scheduleSkillSave({
						skillId,
						skill: sanitizedSkill,
						...(availableTo && hubSkillsEnabled.value ? { availableTo } : {}),
					});
				},
			},
		});
	}

	/** Names the skill modal validates against: every applied skill except the one being edited. */
	function appliedSkillNames(excludeId?: string): string[] {
		return appliedSkills.value.filter(({ id }) => id !== excludeId).map(({ skill }) => skill.name);
	}

	/**
	 * Authoring-time mirror of the backend's `assertSkillNameIsUnique` for
	 * local-skill hosts. The modal validates against `existingSkillNames` before closing
	 */
	/** The scope of the new-name lookup for an "available to" choice. */
	function newNameTarget(
		availableTo: string,
		targetProjectId: string,
		targetAgentId: string,
	): Pick<SkillNewNameQueryDto, 'scope' | 'projectId' | 'agentId'> {
		if (availableTo === 'instance') return { scope: 'instance' };
		if (availableTo === 'agent') return { scope: 'agent', agentId: targetAgentId };
		return { scope: 'project', projectId: targetProjectId };
	}

	function hasDuplicateSkillName(name: string, excludeId?: string): boolean {
		const key = skillNameKey(name);
		return appliedSkillNames(excludeId).some((existing) => skillNameKey(existing) === key);
	}

	function showDuplicateSkillNameError(name: string) {
		showMessage({
			title: locale.baseText('agents.builder.skills.duplicateName.error', {
				interpolate: { name: name.trim() },
			}),
			type: 'error',
		});
	}

	function onRemoveTool(index: number) {
		const currentTools = localConfig.value?.tools ?? [];
		if (index < 0) return;
		if (index < currentTools.length) {
			scheduleConfigUpdate({ tools: currentTools.filter((_, i) => i !== index) });
			return;
		}

		const mcpServers = localConfig.value?.mcpServers ?? [];
		const mcpServerIndex = index - currentTools.length;
		if (mcpServerIndex >= mcpServers.length) return;
		scheduleConfigUpdate({ mcpServers: mcpServers.filter((_, i) => i !== mcpServerIndex) });
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

	async function onOpenAddSkillModal() {
		telemetry?.trackOpenedAddSkillModal?.();

		// Capture the target at open time: the modal can outlive an agent/node
		// switch, and a late confirm must create the skill on the agent the
		// modal was opened for — and only mutate local state if that agent is
		// still the current one.
		const targetProjectId = projectId.value;
		const targetAgentId = agentId.value;
		const isCurrentTarget = () =>
			projectId.value === targetProjectId && agentId.value === targetAgentId;

		if (hubSkillsEnabled.value && ensureAgentPersisted) {
			try {
				await ensureAgentPersisted();
			} catch (error) {
				showError(error, locale.baseText('agents.builder.skills.picker.loadError'));
				return;
			}
			if (!isCurrentTarget()) return;
		}

		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: targetProjectId,
				agentId: targetAgentId,
				existingSkillNames: appliedSkillNames(),
				hubSkillsEnabled: hubSkillsEnabled.value,
				getAttachedSkills: () =>
					appliedSkills.value.map(({ id, skill }) => ({ id, name: skill.name })),
				projectLabel: projectName.value ?? undefined,
				canCreateInstanceSkills: rbacStore.hasScope('skill:create'),
				// The hub refuses a name that the skill's scope already has, so the default
				// name comes from the server, for the "available to" choice.
				...(hubSkillsEnabled.value
					? {
							getDefaultName: async (availableTo: string) =>
								await getNewSkillName(rootStore.restApiContext, {
									...newNameTarget(availableTo, targetProjectId, targetAgentId),
									name: locale.baseText('agents.builder.skills.defaultName'),
								}),
						}
					: {}),
				onRemove: (skillId: string) => {
					if (!isCurrentTarget()) return;
					onRemoveSkill(skillId);
				},
				onAttach: async (librarySkill: SkillListItem) =>
					await attachHubSkill(
						isCurrentTarget,
						async () => await getHubSkill(rootStore.restApiContext, librarySkill.id),
					),
				// The modal stays open until the skill is created, and stays open when the create
				// fails, so the user keeps what they typed. A taken name shows on the name field.
				onConfirm: async ({
					skill,
					availableTo,
					method,
				}: {
					id?: string;
					skill: AgentSkill;
					availableTo?: AgentSkillAvailability;
					method?: SkillCreateMethod;
				}): Promise<AgentSkillConfirmResult> => {
					if (localSkills) {
						if (!isCurrentTarget()) return undefined;
						const sanitizedSkill = normalizeAgentSkillForSave(skill);
						if (hasDuplicateSkillName(sanitizedSkill.name)) {
							showDuplicateSkillNameError(sanitizedSkill.name);
							return undefined;
						}

						// The host mints the skill id and writes body + ref together.
						localSkills.createSkill(sanitizedSkill);
						return undefined;
					}

					const sanitizedSkill = normalizeAgentSkillForSave(skill);
					try {
						await beforeAgentMutation?.();
					} catch {
						// The host owns the autosave error message. Do not also report
						// this as a skill-creation failure.
						return { saved: false };
					}
					if (!isCurrentTarget()) return undefined;
					let result: Awaited<ReturnType<typeof createAgentSkill>>;
					try {
						await ensureAgentPersisted?.();
						if (!isCurrentTarget()) return undefined;
						result = await createAgentSkill(
							rootStore.restApiContext,
							targetProjectId,
							targetAgentId,
							sanitizedSkill,
							hubSkillsEnabled.value ? availableTo : undefined,
							method,
						);
					} catch (error) {
						if (isSkillNameTakenError(error)) {
							return {
								saved: false,
								nameError: locale.baseText('settings.context.skills.error.nameTaken'),
							};
						}
						showError(error, locale.baseText('agents.builder.skills.create.error'));
						return { saved: false };
					}

					// The skill exists now, so the modal can close while the agent catches up.
					void (async () => {
						const { id: skillId, skill: created, skillHash, versionId } = result;
						if (!isCurrentTarget() || agent.value?.id !== targetAgentId) return;
						agent.value = {
							...agent.value,
							versionId,
							skillHashes: {
								...(agent.value.skillHashes ?? {}),
								[skillId]: skillHash,
							},
							skills: {
								...(agent.value.skills ?? {}),
								[skillId]: created,
							},
						};
						let refreshed = true;
						try {
							refreshed =
								(await refreshAgentAfterMutation?.(targetProjectId, targetAgentId)) ?? true;
						} catch (error) {
							showError(error, locale.baseText('agents.builder.loadError'));
							return;
						}
						if (refreshed && isCurrentTarget() && localConfig.value) {
							localConfig.value = {
								...localConfig.value,
								skills: [
									...(localConfig.value.skills ?? []).filter((ref) => ref.id !== skillId),
									{ type: 'skill', id: skillId },
								],
							};
						}
					})();
					return undefined;
				},
			},
		});
	}

	async function attachHubSkill(
		isCurrentTarget: () => boolean,
		loadSkill: () => Promise<SkillDetail>,
	) {
		let hubSkill: SkillDetail;
		try {
			hubSkill = await loadSkill();
		} catch (error) {
			showError(error, locale.baseText('agents.builder.skills.attach.error'));
			return;
		}
		if (!isCurrentTarget() || !agent.value || !localConfig.value) return;
		if (hasDuplicateSkillName(hubSkill.skill.name)) {
			showDuplicateSkillNameError(hubSkill.skill.name);
			return;
		}
		agent.value = {
			...agent.value,
			skillHashes: { ...(agent.value.skillHashes ?? {}), [hubSkill.id]: hubSkill.skillHash },
			skills: { ...(agent.value.skills ?? {}), [hubSkill.id]: hubSkill.skill },
		};
		scheduleConfigUpdate({
			skills: [
				...(localConfig.value.skills ?? []).filter((ref) => ref.id !== hubSkill.id),
				{ type: 'skill', id: hubSkill.id },
			],
		});
		if (!flushConfigSave) return;
		try {
			await flushConfigSave();
		} catch {
			if (isCurrentTarget()) undoRefusedAttach(hubSkill.id);
		}
	}

	function undoRefusedAttach(skillId: string) {
		if (!agent.value || !localConfig.value) return;
		const withoutSkill = <T>(byId: Record<string, T> | undefined) =>
			Object.fromEntries(Object.entries(byId ?? {}).filter(([id]) => id !== skillId));
		agent.value = {
			...agent.value,
			skills: withoutSkill(agent.value.skills),
			skillHashes: withoutSkill(agent.value.skillHashes),
		};
		scheduleConfigUpdate({
			skills: (localConfig.value.skills ?? []).filter((ref) => ref.id !== skillId),
		});
	}

	async function useLatestSkillVersion(skillId: string) {
		const targetAgentId = agentId.value;
		let hubSkill: SkillDetail;
		try {
			hubSkill = await getHubSkill(rootStore.restApiContext, skillId);
		} catch (error) {
			showError(error, locale.baseText('agents.builder.skills.useLatest.error'));
			return;
		}
		if (agentId.value !== targetAgentId || agent.value?.id !== targetAgentId) return;
		if (!localConfig.value) return;
		agent.value = {
			...agent.value,
			skills: { ...(agent.value.skills ?? {}), [skillId]: hubSkill.skill },
			skillHashes: { ...(agent.value.skillHashes ?? {}), [skillId]: hubSkill.skillHash },
			outdatedSkillIds: (agent.value.outdatedSkillIds ?? []).filter((id) => id !== skillId),
		};
		scheduleConfigUpdate({
			skills: (localConfig.value.skills ?? []).map((ref) =>
				ref.id === skillId ? { type: 'skill', id: skillId } : ref,
			),
		});
		try {
			await beforeAgentMutation?.();
		} catch {
			return;
		}
		if (agentId.value !== targetAgentId) return;
		onOpenSkillFromList(skillId);
	}

	function onConnectedTriggersUpdate(triggers: string[]) {
		connectedTriggers.value = triggers;
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
		onOpenAddSkillModal,
		onOpenSkillFromList,
		onRemoveSkill,
		onToggleTask,
		onConnectedTriggersUpdate,
		onTriggerAdded,
	};
}
