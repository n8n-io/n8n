import type { AgentDbMessage, MessageContent } from '@n8n/agents';
import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';

export function contentPartToDto(part: MessageContent): AgentPersistedMessageContentPart {
	const dto: AgentPersistedMessageContentPart = { type: part.type };
	if ('text' in part && typeof part.text === 'string') dto.text = part.text;
	if ('toolName' in part && typeof part.toolName === 'string') dto.toolName = part.toolName;
	if ('toolCallId' in part && typeof part.toolCallId === 'string') {
		dto.toolCallId = part.toolCallId;
	}
	if ('input' in part) dto.input = part.input;
	if ('state' in part && typeof part.state === 'string') dto.state = part.state;
	if ('output' in part) dto.output = part.output;
	if ('error' in part && typeof part.error === 'string') dto.error = part.error;
	return dto;
}

export function messageToDto(msg: AgentDbMessage): AgentPersistedMessageDto | null {
	if (!('role' in msg) || !Array.isArray(msg.content)) return null;
	return {
		id: msg.id,
		role: msg.role,
		content: msg.content.map(contentPartToDto),
	};
}

export function messagesToDto(msgs: AgentDbMessage[]): AgentPersistedMessageDto[] {
	const out: AgentPersistedMessageDto[] = [];
	for (const m of msgs) {
		const dto = messageToDto(m);
		if (dto) out.push(dto);
	}
	return out;
}
