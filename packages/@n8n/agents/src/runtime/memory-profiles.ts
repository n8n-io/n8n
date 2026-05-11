import { generateText } from 'ai';

import type { AgentEventBus } from './event-bus';
import { isRecord, parseJsonObject, stripMarkdownFence, textFromMessage } from './memory-utils';
import { createModel } from './model-factory';
import { isLlmMessage } from '../sdk/message';
import type {
	AgentDbMessage,
	AgentResourceScope,
	BuiltMemory,
	BuiltMemoryProfileStore,
	MemoryProfileScope,
	MemoryProfilesConfig,
	ModelConfig,
} from '../types';
import { AgentEvent } from '../types/runtime/event';
import type { SerializedMessageList } from '../types/runtime/message-list';

export const DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT = `You maintain two concise mutable memory profile documents.

Inputs:
- Agent description defines what the agent is.
- Current agent-profile is what the agent has learned about its durable persona.
- Current user-profile is what the agent has learned about this user or resource.
- Recent conversation pair is the latest exchange.

Update the profiles only when the conversation contains durable information that should persist across sessions.

Agent-profile captures durable facts about the agent's persona, role, behavior, response style, operating constraints, and interaction patterns.
User-profile captures stable cross-session information about the user or resource:
- stable identity or role
- durable context about the user's normal environment or responsibilities
- stable preferences about communication style, workflow, tools, environment, ownership, or domain context
- durable environment preferences only when they describe the user's normal setup

Rules:
- Most pairs should produce no update. Be conservative.
- Use user-authored statements as the source of durable profile changes.
- Assistant messages are supporting context only and cannot create durable profile memory by themselves.
- Assistant acknowledgements may help interpret user-authored instructions, but are not evidence on their own.
- <user-profile> is not task memory and must never be connected to the current objective of an agent.
- User-profile must exclude active project state, debugging steps, implementation order, branch stack, test flow, next actions, temporary constraints, session objectives, facts about this agent's internals, and facts about a specific feature unless phrased as a stable user preference.
- User-profile may include durable user preferences, including response style, communication style, workflow preferences, and priorities that should personalize future conversations.
- If the information would stop being useful after the current task ends, it does not belong in <user-profile>.
- If the information describes the agent's own durable persona, role, identity, or operating mode, it belongs in <agent-profile>.
- If the information needs source or provenance, it does not belong in <user-profile>.
- Agent-profile may include descriptive persona facts and durable operating rules, but must exclude implementation facts, model names, storage/data-model facts, schema facts, current feature details, current implementation details, and session state unless they define the configured agent's durable persona or operating mode.
- Existing profile content is not authoritative. Rewrite profiles to remove entries that violate these rules, even if no new durable information is present.
- Do not summarize the conversation.
- Do not add situational or one-task-only details.
- Do not copy the agent description verbatim.
- If a profile needs no update or cleanup, return the existing profile content exactly.

Return only JSON in this exact shape:
{"agentProfile":"...","userProfile":"..."}`;

interface NormalizedMemoryProfilesConfig {
	profileUpdatePrompt: string;
	agentDescription?: string;
}

interface ProfileUpdateTurn {
	userMessage: string;
	assistantMessage: string;
}

function hasMemoryProfileStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltMemoryProfileStore {
	return (
		typeof Reflect.get(memory, 'getMemoryProfile') === 'function' &&
		typeof Reflect.get(memory, 'saveMemoryProfile') === 'function'
	);
}

export function isMemoryProfilesEnabled(
	config: MemoryProfilesConfig | undefined,
): config is MemoryProfilesConfig {
	return config !== undefined && config.enabled !== false;
}

function withMemoryProfileDefaults(config: MemoryProfilesConfig): NormalizedMemoryProfilesConfig {
	return {
		profileUpdatePrompt: config.prompts?.profileUpdate ?? DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT,
		...(config.agentDescription !== undefined && { agentDescription: config.agentDescription }),
	};
}

export async function loadMemoryProfileContext(opts: {
	memory: BuiltMemory;
	persistence?: Partial<AgentResourceScope>;
}): Promise<SerializedMessageList['memoryProfile'] | undefined> {
	if (!hasMemoryProfileStore(opts.memory)) return undefined;
	return await loadMemoryProfiles(
		opts.memory,
		opts.persistence?.agentId,
		opts.persistence?.resourceId,
	);
}

export async function updateMemoryProfilesFromTurn(opts: {
	memory: BuiltMemory;
	config: MemoryProfilesConfig;
	model: ModelConfig;
	scope: AgentResourceScope;
	currentProfile: SerializedMessageList['memoryProfile'] | undefined;
	messages: AgentDbMessage[];
	eventBus: AgentEventBus;
}): Promise<void> {
	if (!isMemoryProfilesEnabled(opts.config) || !hasMemoryProfileStore(opts.memory)) return;
	const turn = findLatestUserAssistantPair(opts.messages);
	if (!turn) return;

	try {
		const normalized = withMemoryProfileDefaults(opts.config);
		const current =
			opts.currentProfile ??
			(await loadMemoryProfiles(opts.memory, opts.scope.agentId, opts.scope.resourceId));

		const { text } = await generateText({
			model: createModel(opts.model),
			system: normalized.profileUpdatePrompt,
			prompt: renderMemoryProfileUpdatePrompt({
				agentDescription: normalized.agentDescription,
				agentProfile: current?.agentProfile ?? '',
				userProfile: current?.userProfile ?? '',
				turn,
			}),
		});

		const parsed = parseProfileUpdate(text);
		if (!parsed) return;

		await saveProfileIfChanged({
			memory: opts.memory,
			scope: agentMemoryProfileScope(opts.scope.agentId),
			current: current?.agentProfile ?? '',
			next: parsed.agentProfile,
		});
		await saveProfileIfChanged({
			memory: opts.memory,
			scope: resourceMemoryProfileScope(opts.scope.resourceId),
			current: current?.userProfile ?? '',
			next: parsed.userProfile,
		});
	} catch (error) {
		opts.eventBus.emit({
			type: AgentEvent.Error,
			message: 'Memory profile update failed',
			error,
			source: 'memory-profiles',
		});
	}
}

async function loadMemoryProfiles(
	memory: BuiltMemory & BuiltMemoryProfileStore,
	agentId: string | undefined,
	resourceId: string | undefined,
): Promise<SerializedMessageList['memoryProfile'] | undefined> {
	const [agentProfile, userProfile] = await Promise.all([
		agentId ? memory.getMemoryProfile(agentMemoryProfileScope(agentId)) : Promise.resolve(null),
		resourceId
			? memory.getMemoryProfile(resourceMemoryProfileScope(resourceId))
			: Promise.resolve(null),
	]);

	const context = {
		agentProfile: agentProfile?.content ?? null,
		userProfile: userProfile?.content ?? null,
	};
	return context.agentProfile || context.userProfile ? context : undefined;
}

function renderMemoryProfileUpdatePrompt(ctx: {
	agentDescription?: string;
	agentProfile: string;
	userProfile: string;
	turn: ProfileUpdateTurn;
}): string {
	const agentDescription = ctx.agentDescription?.trim();
	return [
		...(agentDescription
			? ['<agent-description>', agentDescription, '</agent-description>', '']
			: []),
		'<agent-profile>',
		ctx.agentProfile.trim(),
		'</agent-profile>',
		'',
		'<user-profile>',
		ctx.userProfile.trim(),
		'</user-profile>',
		'',
		'<turn>',
		'<user-message>',
		ctx.turn.userMessage,
		'</user-message>',
		'',
		'<assistant-message>',
		ctx.turn.assistantMessage,
		'</assistant-message>',
		'</turn>',
	].join('\n');
}

function parseProfileUpdate(text: string): { agentProfile: string; userProfile: string } | null {
	const parsed = parseJsonObject(stripMarkdownFence(text));
	if (!isRecord(parsed)) return null;
	const agentProfile = parsed.agentProfile;
	const userProfile = parsed.userProfile;
	if (typeof agentProfile !== 'string' || typeof userProfile !== 'string') return null;
	return { agentProfile: agentProfile.trim(), userProfile: userProfile.trim() };
}

async function saveProfileIfChanged(opts: {
	memory: BuiltMemory & BuiltMemoryProfileStore;
	scope: MemoryProfileScope;
	current: string;
	next: string;
}): Promise<void> {
	if (opts.next === opts.current.trim()) return;
	if (opts.next.length === 0 && opts.current.trim().length === 0) return;
	await opts.memory.saveMemoryProfile(opts.scope, opts.next, null);
}

function agentMemoryProfileScope(agentId: string): MemoryProfileScope {
	return { scopeKind: 'agent', scopeId: agentId };
}

function resourceMemoryProfileScope(resourceId: string): MemoryProfileScope {
	return { scopeKind: 'resource', scopeId: resourceId };
}

function findLatestUserAssistantPair(messages: AgentDbMessage[]): ProfileUpdateTurn | null {
	for (let assistantIndex = messages.length - 1; assistantIndex >= 0; assistantIndex--) {
		const assistant = messages[assistantIndex];
		if (!isLlmMessage(assistant) || assistant.role !== 'assistant') continue;
		const assistantMessage = textFromMessage(assistant);
		if (!assistantMessage) continue;

		for (let userIndex = assistantIndex - 1; userIndex >= 0; userIndex--) {
			const user = messages[userIndex];
			if (!isLlmMessage(user) || user.role !== 'user') continue;
			const userMessage = textFromMessage(user);
			if (!userMessage) continue;
			return { userMessage, assistantMessage };
		}
	}

	return null;
}
