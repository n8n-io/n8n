/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */
import type { BuiltTool } from '@n8n/agents';

import { isParseableAttachment } from '../parsers/structured-file-parser';
import { createToolRegistry } from '../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry, OrchestrationContext } from '../types';
import { resolveAgentBuilderTarget } from './orchestration/agent-target-binding';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from './tool-ids';

const lazyMod = <T>(loader: () => T): (() => T) => {
	let cached: T | undefined;
	return () => (cached ??= loader());
};

const loadParseFileTool = lazyMod(
	() => require('./attachments/parse-file.tool') as typeof import('./attachments/parse-file.tool'),
);
const loadCredentialsTool = lazyMod(
	() => require('./credentials.tool') as typeof import('./credentials.tool'),
);
const loadConversationHistoryTool = lazyMod(
	() => require('./conversation-history.tool') as typeof import('./conversation-history.tool'),
);
const loadSearchModelsTool = lazyMod(
	() => require('./search-models.tool') as typeof import('./search-models.tool'),
);
const loadMcpServersTool = lazyMod(
	() => require('./mcp-servers.tool') as typeof import('./mcp-servers.tool'),
);
const loadActivityTool = lazyMod(
	() => require('./activity.tool') as typeof import('./activity.tool'),
);
const loadSaveUserPreferenceTool = lazyMod(
	() => require('./save-user-preference.tool') as typeof import('./save-user-preference.tool'),
);
const loadSkillsTool = lazyMod(() => require('./skills.tool') as typeof import('./skills.tool'));
const loadN8nDocsTool = lazyMod(
	() => require('./n8n-docs.tool') as typeof import('./n8n-docs.tool'),
);
const loadAgentContextTool = lazyMod(
	() => require('./agent-context.tool') as typeof import('./agent-context.tool'),
);
const loadSelectAgentTool = lazyMod(
	() =>
		require('./orchestration/select-agent.tool') as typeof import('./orchestration/select-agent.tool'),
);
const loadAgentBuilderTools = lazyMod(
	() => require('./orchestration/builder-tools') as typeof import('./orchestration/builder-tools'),
);
const loadGetSessionTool = lazyMod(
	() =>
		require('./orchestration/get-session.tool') as typeof import('./orchestration/get-session.tool'),
);
const loadResearchTool = lazyMod(
	() => require('./research.tool') as typeof import('./research.tool'),
);
const loadAskUserTool = lazyMod(
	() => require('./shared/ask-user.tool') as typeof import('./shared/ask-user.tool'),
);
const loadLeaveOnboardingTool = lazyMod(
	() =>
		require('./shared/leave-onboarding.tool') as typeof import('./shared/leave-onboarding.tool'),
);

type DomainToolFactory = () => BuiltTool;

function getOrchestratorDomainToolFactories(
	context: InstanceAiContext,
): Array<[string, DomainToolFactory]> {
	const tools: Array<[string, DomainToolFactory]> = [
		[DOMAIN_TOOL_IDS.CREDENTIALS, () => loadCredentialsTool().createCredentialsTool(context)],
		[DOMAIN_TOOL_IDS.RESEARCH, () => loadResearchTool().createResearchTool(context)],
		[DOMAIN_TOOL_IDS.N8N_DOCS, () => loadN8nDocsTool().createN8nDocsTool(context)],
		[DOMAIN_TOOL_IDS.SEARCH_MODELS, () => loadSearchModelsTool().createSearchModelsTool()],
		[DOMAIN_TOOL_IDS.ASK_USER, () => loadAskUserTool().createAskUserTool()],
	];

	// Onboarding threads only: the tool ends the flow the host seeded, and the frontend restores
	// the chat chrome when it sees the call.
	if (context.onboardingThread) {
		tools.push([
			DOMAIN_TOOL_IDS.LEAVE_ONBOARDING,
			() => loadLeaveOnboardingTool().createLeaveOnboardingTool(),
		]);
	}

	// Same pattern: the adapter only wires mcpService when MCP access is enabled
	// instance-wide and the user is in the MCP-connections experiment. Orchestrator
	// only — sub-agents can't offer the user a connection.
	if (context.mcpService) {
		tools.push([
			DOMAIN_TOOL_IDS.MCP_SERVERS,
			() => loadMcpServersTool().createMcpServersTool(context),
		]);
	}

	// Orchestrator-only: sub-agents receive context via briefings, and cross-thread
	// reads stay with the agent the user talks to. The adapter only wires
	// conversationHistoryService when the run has a bound project.
	if (context.conversationHistoryService) {
		tools.push([
			DOMAIN_TOOL_IDS.CONVERSATION_HISTORY,
			() => loadConversationHistoryTool().createConversationHistoryTool(context),
		]);
	}

	// Same pattern: the adapter wires `activityService` only when the reader is enabled, so
	// presence is the flag as far as the tool layer is concerned. Orchestrator only, because the
	// block that hands the agent ids to expand rides the orchestrator's turn.
	if (context.activityService) {
		tools.push([DOMAIN_TOOL_IDS.ACTIVITY, () => loadActivityTool().createActivityTool(context)]);
	}

	if (context.agentContextService) {
		tools.push([
			DOMAIN_TOOL_IDS.AGENT_CONTEXT,
			() =>
				loadAgentContextTool().createAgentContextTool({
					reader: context.agentContextService!,
					resolveDefaultAgentId: async () => (await resolveAgentBuilderTarget(context))?.agentId,
					logger: context.logger,
				}),
		]);
	}

	// Presence is the gate, as with activity: the adapter wires `aiPreferenceService`
	// only when saved preferences are enabled for this user.
	if (context.aiPreferenceService) {
		tools.push([
			DOMAIN_TOOL_IDS.SAVE_USER_PREFERENCE,
			() => loadSaveUserPreferenceTool().createSaveUserPreferenceTool(context),
		]);
	}

	if (context.skillService) {
		tools.push([DOMAIN_TOOL_IDS.SKILLS, () => loadSkillsTool().createSkillsTool(context)]);
	}

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push([
			DOMAIN_TOOL_IDS.PARSE_FILE,
			() => loadParseFileTool().createParseFileTool(context),
		]);
	}

	return tools;
}

/** Returns only the native domain tool names active for this request. */
export function getActiveOrchestratorDomainToolNames(context: InstanceAiContext): Set<string> {
	return new Set(getOrchestratorDomainToolFactories(context).map(([name]) => name));
}

/** Creates the native n8n domain tools available to the orchestrator. */
export function createOrchestratorDomainTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = getOrchestratorDomainToolFactories(context).map(
		([name, createTool]) => [name, createTool()],
	);

	return createToolRegistry(tools);
}

/**
 * Creates orchestration-only tools (task planning, task control).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [];
	const builderDelegate = context.domainContext?.builderDelegate;
	if (builderDelegate) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.SELECT_AGENT,
			loadSelectAgentTool().createSelectAgentTool(context),
		]);
		for (const tool of loadAgentBuilderTools().createAgentBuilderTools(context, builderDelegate)) {
			tools.push([tool.name, tool]);
		}
	}

	if (context.domainContext?.agentPreviewSession && context.domainContext?.resolvePreviewSession) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.GET_SESSION,
			loadGetSessionTool().createGetSessionTool(context),
		]);
	}

	return createToolRegistry(tools);
}
