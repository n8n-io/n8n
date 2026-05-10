import type { AgentPersistenceOptions, AgentResourceScope, Message } from '../types';

export function requireAgentResourceScope(
	persistence: AgentPersistenceOptions | undefined,
	feature: string,
): AgentResourceScope {
	if (!persistence?.agentId || !persistence.resourceId) {
		throw new Error(`${feature} requires persistence.agentId and persistence.resourceId.`);
	}

	return {
		agentId: persistence.agentId,
		resourceId: persistence.resourceId,
	};
}

export function textFromMessage(message: Message): string {
	return message.content
		.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
		.map((part) => part.text)
		.join('\n')
		.trim();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function stripMarkdownFence(text: string): string {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenced?.[1]?.trim() ?? trimmed;
}

export function parseJsonObject(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start === -1 || end === -1 || end <= start) return undefined;
		try {
			return JSON.parse(text.slice(start, end + 1));
		} catch {
			return undefined;
		}
	}
}
