import { isLlmMessage, isRuntimeSkillUpdate } from '../sdk/message';
import { isMainSkillFilePath } from './tools';
import { SKILL_LOAD_TOOL_NAME } from './types';
import type { AgentMessage } from '../types/sdk/message';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Skill ids from the `load_skill` calls in one message that returned the skill body.
 * Only a body load returns `type: 'content'`. Failures and linked files return a
 * `success` object. A reference loaded by path is skipped: its id is not in the input.
 */
function loadedSkillIds(message: AgentMessage): string[] {
	return loadedSkills(message).map(({ id }) => id);
}

function loadedSkills(message: AgentMessage): Array<{ id: string; hash?: string }> {
	if (!isLlmMessage(message) || message.role !== 'assistant') return [];
	return message.content.flatMap((part) => {
		if (part.type !== 'tool-call' || part.toolName !== SKILL_LOAD_TOOL_NAME) return [];
		if (part.state !== 'resolved' || part.canceled || !isPlainObject(part.input)) return [];
		if (!isPlainObject(part.output) || part.output.type !== 'content') return [];
		const { filePath } = part.input;
		if (
			filePath !== undefined &&
			(typeof filePath !== 'string' || !isMainSkillFilePath(filePath))
		) {
			return [];
		}
		// The result names the canonical id. Older results do not, so fall back to the input.
		const id = envelopeValue(part.output.value, SKILL_ID_LINE) ?? part.input.skillId;
		if (typeof id !== 'string') return [];
		return [{ id, hash: envelopeValue(part.output.value, SKILL_HASH_LINE) }];
	});
}

const SKILL_ID_LINE = /^\[Skill id: ("(?:[^"\\]|\\.)*")\]$/m;
const SKILL_HASH_LINE = /^\[Skill hash: ("(?:[^"\\]|\\.)*")\]$/m;

function envelopeValue(value: unknown, line: RegExp): string | undefined {
	if (!Array.isArray(value)) return undefined;
	for (const block of value) {
		if (!isPlainObject(block) || typeof block.text !== 'string') continue;
		const match = line.exec(block.text);
		if (!match) continue;
		try {
			const id: unknown = JSON.parse(match[1]);
			if (typeof id === 'string') return id;
		} catch {
			// A malformed line is not a skill id.
		}
	}
	return undefined;
}

/** Skills that the agent loaded in its latest assistant message. */
export function detectJustLoadedSkills(messages: readonly AgentMessage[]): Set<string> {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (isLlmMessage(message) && message.role === 'assistant') {
			return new Set(loadedSkillIds(message));
		}
	}
	return new Set();
}

/** Skills that a `load_skill` call in the given messages loaded. */
export function detectLoadedSkills(messages: readonly AgentMessage[]): Set<string> {
	return new Set(messages.flatMap(loadedSkillIds));
}

/**
 * The latest skill hash the model saw for each loaded skill, from `load_skill`
 * results and skill update notes. Null means a note told the model that the
 * skill is unavailable. A result without a hash line maps to undefined.
 */
export function detectSeenSkillVersions(
	messages: readonly AgentMessage[],
): Map<string, string | null | undefined> {
	const versions = new Map<string, string | null | undefined>();
	for (const message of messages) {
		if (isRuntimeSkillUpdate(message)) {
			const { skillId, version } = message.data.skillUpdate;
			versions.set(skillId, version);
			continue;
		}
		for (const { id, hash } of loadedSkills(message)) versions.set(id, hash);
	}
	return versions;
}
