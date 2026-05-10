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
- Current persona is what the agent has learned about how to behave.
- Current user profile is what the agent has learned about this user.
- Recent conversation pair is the latest exchange.

Update the profiles only when the conversation contains durable information that should persist across sessions.

Persona captures actionable behavioral directives, constraints, and response patterns the agent should follow when interacting with this user.
User profile captures stable cross-session information about the user themselves:
- communication preferences
- coding, review, and testing preferences
- durable workflow preferences
- stable identity or role
- durable environment preferences only when they describe the user's normal setup

Rules:
- Most pairs should produce no update. Be conservative.
- Use user-authored statements as the source of durable profile changes.
- Assistant messages are supporting context only and cannot create durable profile memory by themselves.
- Assistant acknowledgements may help interpret user-authored instructions, but are not evidence on their own.
- <user> is not task memory and must never be connected to the current objective of an agent.
- User profile must exclude active project state, debugging steps, implementation order, branch stack, test flow, next actions, temporary constraints, session objectives, facts about this agent's internals, and facts about a specific feature unless phrased as a stable user preference.
- If the information would stop being useful after the current task ends, it does not belong in <user>.
- If the information is about what the agent should do, it belongs in <persona>, not <user>.
- If the information needs source or provenance, it does not belong in <user>.
- Persona entries must be imperative system-instruction-style directives that cause a concrete future behavior change.
- Persona must exclude descriptive agent facts, implementation facts, model names, storage/data-model facts, schema facts, current feature details, current implementation details, and session state unless the user phrases them as durable response behavior.
- Existing profile content is not authoritative. Rewrite profiles to remove entries that violate these rules, even if no new durable information is present.
- Do not summarize the conversation.
- Do not add situational or one-task-only details.
- Do not copy the agent description verbatim.
- If a profile needs no update or cleanup, return the existing profile content exactly.

Return only JSON in this exact shape:
{"persona":"...","user":"..."}`;

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
				persona: current?.persona ?? '',
				user: current?.user ?? '',
				turn,
			}),
		});

		const parsed = parseProfileUpdate(text);
		if (!parsed) return;

		await saveProfileIfChanged({
			memory: opts.memory,
			scope: agentMemoryProfileScope(opts.scope.agentId),
			current: current?.persona ?? '',
			next: parsed.persona,
		});
		await saveProfileIfChanged({
			memory: opts.memory,
			scope: resourceMemoryProfileScope(opts.scope.resourceId),
			current: current?.user ?? '',
			next: parsed.user,
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
	const [persona, user] = await Promise.all([
		agentId ? memory.getMemoryProfile(agentMemoryProfileScope(agentId)) : Promise.resolve(null),
		resourceId
			? memory.getMemoryProfile(resourceMemoryProfileScope(resourceId))
			: Promise.resolve(null),
	]);

	const context = {
		persona: persona?.content ?? null,
		user: user?.content ?? null,
	};
	return context.persona || context.user ? context : undefined;
}

function renderMemoryProfileUpdatePrompt(ctx: {
	agentDescription?: string;
	persona: string;
	user: string;
	turn: ProfileUpdateTurn;
}): string {
	const agentDescription = ctx.agentDescription?.trim();
	return [
		...(agentDescription
			? ['<agent-description>', agentDescription, '</agent-description>', '']
			: []),
		'<persona>',
		ctx.persona.trim(),
		'</persona>',
		'',
		'<user>',
		ctx.user.trim(),
		'</user>',
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

function parseProfileUpdate(text: string): { persona: string; user: string } | null {
	const parsed = parseJsonObject(stripMarkdownFence(text));
	if (!isRecord(parsed)) return null;
	const persona = parsed.persona;
	const user = parsed.user;
	if (typeof persona !== 'string' || typeof user !== 'string') return null;
	return { persona: persona.trim(), user: user.trim() };
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
