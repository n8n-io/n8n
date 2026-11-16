import {
	SKILL_LOAD_TOOL_NAME,
	type RuntimeSkillContent,
	type RuntimeSkillRegistryEntry,
} from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

export function createHubSkillDisplayMapper(
	loaded: ReadonlyMap<string, RuntimeSkillContent & Pick<RuntimeSkillRegistryEntry, 'hash'>>,
) {
	const skillCalls = new Map<string, string>();
	return (event: InstanceAiEvent): InstanceAiEvent => {
		if (event.type === 'tool-call' && event.payload.toolName === SKILL_LOAD_TOOL_NAME) {
			skillCalls.set(event.payload.toolCallId, event.agentId);
		}
		if (event.type !== 'tool-result' && event.type !== 'tool-error') return event;
		if (skillCalls.get(event.payload.toolCallId) !== event.agentId) return event;
		skillCalls.delete(event.payload.toolCallId);
		if (event.type === 'tool-error') return event;

		const { result } = event.payload;
		if (
			!isRecord(result) ||
			result.success !== true ||
			typeof result.skillId !== 'string' ||
			result.filePath !== undefined
		) {
			return event;
		}
		const skill = loaded.get(result.skillId);
		if (!skill || skill.hash !== result.hash) return event;

		return {
			...event,
			payload: {
				...event.payload,
				result: { ...result, content: skill.instructions },
			},
		};
	};
}
