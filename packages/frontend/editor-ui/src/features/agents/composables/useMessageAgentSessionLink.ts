import { computed, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';

import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import type { LogEntry } from '@/features/execution/logs/logs.types';

/**
 * Session identifiers the MessageAnAgent node emits in its output JSON. Kept
 * structural so we don't have to import the runtime type from `n8n-workflow`
 * just to read three string fields.
 */
type MessageAgentSession = {
	agentId: string;
	projectId: string;
	sessionId: string;
};

function isMessageAgentSession(value: unknown): value is MessageAgentSession {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.agentId === 'string' &&
		typeof v.projectId === 'string' &&
		typeof v.sessionId === 'string' &&
		v.agentId !== '' &&
		v.projectId !== '' &&
		v.sessionId !== ''
	);
}

function extractSession(logEntry: LogEntry | undefined): MessageAgentSession | null {
	if (!logEntry) return null;
	if (logEntry.node.type !== MESSAGE_AN_AGENT_NODE_TYPE) return null;

	const main = logEntry.runData?.data?.main;
	if (!Array.isArray(main)) return null;

	for (const branch of main) {
		if (!Array.isArray(branch)) continue;
		for (const item of branch) {
			const session = (item?.json as Record<string, unknown> | undefined)?.session;
			if (isMessageAgentSession(session)) return session;
		}
	}

	return null;
}

/**
 * Given a log entry, expose a resolved session URL + opener for MessageAnAgent
 * runs that emitted a `session` block in their output JSON. Returns `null` for
 * any other node-type or runs missing the expected payload, so the caller can
 * `v-if` straight off `link`.
 *
 * Opens in a new tab (matching n8n's other deep links from execution log) so
 * the workflow execution view stays in place — and so the link still works
 * when the logs panel is popped out into its own window.
 */
export function useMessageAgentSessionLink(logEntry: ComputedRef<LogEntry | undefined>): {
	link: ComputedRef<{ href: string; open: () => void } | null>;
} {
	const router = useRouter();

	const link = computed(() => {
		const session = extractSession(logEntry.value);
		if (!session) return null;

		// Guard against the agents module not being mounted (or any router that
		// doesn't know the route, e.g. in unit tests). `router.resolve` throws
		// for unknown named routes — without this, the button would crash the
		// log panel render in environments where agents aren't loaded.
		let href: string;
		try {
			href = router.resolve({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: session.projectId,
					agentId: session.agentId,
					threadId: session.sessionId,
				},
			}).href;
		} catch {
			return null;
		}

		return {
			href,
			open: () => {
				window.open(href, '_blank', 'noopener');
			},
		};
	});

	return { link };
}
