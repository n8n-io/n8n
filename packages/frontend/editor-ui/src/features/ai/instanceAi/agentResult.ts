import type { InstanceAiAgentNode, InstanceAiTimelineEntry } from '@n8n/api-types';

function normalizeAgentText(text: string | undefined): string {
	return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function extractTimelineText(timeline: InstanceAiTimelineEntry[]): string {
	return timeline
		.filter(
			(entry): entry is Extract<InstanceAiTimelineEntry, { type: 'text' }> => entry.type === 'text',
		)
		.map((entry) => entry.content)
		.join(' ');
}

export function getRenderableAgentResult(agentNode: InstanceAiAgentNode): string | null {
	const result = agentNode.result?.trim();
	if (!result) return null;

	const normalizedResult = normalizeAgentText(result);
	if (!normalizedResult) return null;

	const normalizedTextContent = normalizeAgentText(agentNode.textContent);
	if (normalizedTextContent && normalizedResult === normalizedTextContent) {
		return null;
	}

	const normalizedTimelineText = normalizeAgentText(extractTimelineText(agentNode.timeline));
	if (normalizedTimelineText && normalizedResult === normalizedTimelineText) {
		return null;
	}

	return result;
}
