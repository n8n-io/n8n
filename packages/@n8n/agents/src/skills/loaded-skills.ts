import { isLlmMessage } from '../sdk/message';
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
		const id = skillIdFromResult(part.output.value) ?? part.input.skillId;
		return typeof id === 'string' ? [id] : [];
	});
}

const SKILL_ID_LINE = /^\[Skill id: ("(?:[^"\\]|\\.)*")\]$/m;

function skillIdFromResult(value: unknown): string | undefined {
	if (!Array.isArray(value)) return undefined;
	for (const block of value) {
		if (!isPlainObject(block) || typeof block.text !== 'string') continue;
		const match = SKILL_ID_LINE.exec(block.text);
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
