import type { AgentsChatMessage, ThinkingSegment } from './types';

export function getMessageThinkingSegments(message: AgentsChatMessage): ThinkingSegment[] {
	if (message.thinkingSegments?.length) {
		return message.thinkingSegments.filter((segment) => segment.content.trim().length > 0);
	}

	if (!message.thinking?.trim()) return [];
	return [{ id: `${message.id}:reasoning`, content: message.thinking }];
}

export function getThinkingDurationSec(segments: ThinkingSegment[]): number | undefined {
	let startTime: number | undefined;
	let endTime: number | undefined;

	for (const segment of segments) {
		if (segment.startTime !== undefined) {
			startTime =
				startTime === undefined ? segment.startTime : Math.min(startTime, segment.startTime);
		}
		if (segment.endTime !== undefined) {
			endTime = endTime === undefined ? segment.endTime : Math.max(endTime, segment.endTime);
		}
	}

	if (startTime === undefined || endTime === undefined || endTime < startTime) return undefined;
	return Math.max(1, Math.round((endTime - startTime) / 1000));
}
