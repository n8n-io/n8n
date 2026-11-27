import type { AgentSessionLatestActivity } from '@n8n/api-types';

import type { TimelineEvent } from '../execution-recorder';

/** Select by event time because tool calls can finish out of timeline order. */
export function latestSessionActivity(
	timeline: TimelineEvent[] | null,
): AgentSessionLatestActivity | null {
	let latest: AgentSessionLatestActivity | null = null;
	let latestTime = -Infinity;

	for (const event of timeline ?? []) {
		if (event.type !== 'tool-call' && event.type !== 'reasoning' && event.type !== 'text') continue;
		const time =
			event.type === 'tool-call'
				? Math.max(event.startTime, event.endTime)
				: (event.endTime ?? event.timestamp);
		if (time < latestTime) continue;
		latestTime = time;
		if (event.type === 'tool-call') {
			latest = {
				type: 'tool-call',
				toolName: event.name,
				displayName: event.nodeDisplayName?.trim() || event.workflowName?.trim() || undefined,
			};
		} else {
			latest = { type: event.type };
		}
	}

	return latest;
}
