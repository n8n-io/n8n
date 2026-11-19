import type {
	McpServerAnalyticsDto,
	McpServerHealth,
	McpServerMissingCapabilityDto,
} from '@n8n/api-types';

import type { McpServerCallEntity } from './database/mcp-server.entities';

export type InsightCall = Pick<
	McpServerCallEntity,
	'kind' | 'name' | 'status' | 'intent' | 'sessionId' | 'clientName' | 'createdAt'
>;

const toWords = (value: string) =>
	value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);

/**
 * Finds a tool that can do a request written in plain language.
 * ponytail: word match on the tool name ("cancel_order" matches "cancel an order").
 * Upgrade: store the request on the tool when the Assistant builds it.
 */
export function matchTool(request: string, toolNames: string[], isLabel = false): string | null {
	const words = toWords(request);
	const isSame = (word: string, part: string) =>
		word.startsWith(part) || (word.length > 3 && part.startsWith(word));
	return (
		toolNames.find((name) => {
			const parts = toWords(name);
			if (parts.length === 0 || words.length === 0) return false;
			return (
				parts.every((part) => words.some((word) => isSame(word, part))) ||
				// A label is short, so a longer tool name can also contain it:
				// "cancel_order" matches the tool "cancel_order_and_refund".
				(isLabel && words.every((word) => parts.some((part) => isSame(word, part))))
			);
		}) ?? null
	);
}

/** Makes a label from the text of an AI client: "Cancel Order" becomes "cancel_order". */
export function toLabel(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	return toWords(value).join('_').slice(0, 64) || null;
}

/**
 * ponytail: the label of a missing request is stored as a prefix of the request text
 * ("cancel_order: Cancel the order"), so no new column is necessary. Upgrade: a column.
 */
export function joinLabel(label: string | null, request: string | null) {
	return label && request ? `${label}: ${request}` : request;
}

export function splitLabel(intent: string): { label: string | null; request: string } {
	const match = /^([a-z0-9_]{1,64}): (.+)$/s.exec(intent.trim());
	return match ? { label: match[1], request: match[2] } : { label: null, request: intent.trim() };
}

/** Calls of each session, in time order. `calls` must be in time order. */
function groupBySession(calls: InsightCall[]) {
	const sessions = new Map<string, InsightCall[]>();
	for (const call of calls) {
		if (!call.sessionId) continue;
		const list = sessions.get(call.sessionId) ?? [];
		list.push(call);
		sessions.set(call.sessionId, list);
	}
	return sessions;
}

/** The outcome of a session is the outcome of its last call. */
export function sessionOutcomes(calls: InsightCall[]): McpServerAnalyticsDto['sessionOutcomes'] {
	const outcomes = { completed: 0, failed: 0, deadEnd: 0 };
	for (const session of groupBySession(calls).values()) {
		const last = session[session.length - 1];
		if (last.kind === 'missing') outcomes.deadEnd++;
		else if (last.status === 'error') outcomes.failed++;
		else outcomes.completed++;
	}
	return outcomes;
}

/** Requests for missing tools, with the evidence that helps to build each tool. */
export function missingCapabilities(
	calls: InsightCall[],
	toolNames: string[],
): McpServerMissingCapabilityDto[] {
	const groups = new Map<
		string,
		{
			label: string | null;
			count: number;
			examples: Set<string>;
			sessions: Set<string>;
			clients: Set<string>;
			tools: Set<string>;
		}
	>();
	const lastSession = new Map<string, string>();
	for (const session of groupBySession(calls).values()) {
		session.forEach((call, index) => {
			if (call.kind !== 'missing' || !call.intent?.trim()) return;
			// Requests with the same label are one row. A request without a label is its own row.
			const { label, request } = splitLabel(call.intent);
			const name = label ?? request.toLowerCase();
			const group = groups.get(name) ?? {
				label,
				count: 0,
				examples: new Set(),
				sessions: new Set(),
				clients: new Set(),
				tools: new Set(),
			};
			group.count++;
			group.examples.add(request);
			group.sessions.add(call.sessionId ?? '');
			if (call.clientName) group.clients.add(call.clientName);
			for (const earlier of session.slice(0, index)) {
				if (earlier.kind === 'tool') group.tools.add(earlier.name);
			}
			groups.set(name, group);
			lastSession.set(name, call.sessionId ?? '');
		});
	}
	return (
		[...groups.entries()]
			.map(([name, group]) => ({
				name,
				label: group.label,
				examples: [...group.examples].slice(0, 3),
				count: group.count,
				sessions: group.sessions.size,
				clients: [...group.clients],
				precedingTools: [...group.tools],
				resolvedBy:
					matchTool(name, toolNames, !!group.label) ??
					[...group.examples].map((example) => matchTool(example, toolNames)).find(Boolean) ??
					null,
				lastSessionId: lastSession.get(name) ?? null,
			}))
			// Open requests first. One client that repeats a request counts as one session.
			.sort(
				(a, b) =>
					Number(!!a.resolvedBy) - Number(!!b.resolvedBy) ||
					b.sessions - a.sessions ||
					b.count - a.count,
			)
	);
}

/**
 * One grade for a server, so that a fleet list can show the worst server first.
 * ponytail: fixed limits. Upgrade: limits that the owner sets for each server.
 */
export function serverHealth(
	calls: number,
	errorRate: number,
	deadEndRate: number,
): McpServerHealth {
	if (calls === 0) return 'idle';
	if (errorRate >= 0.2) return 'failing';
	if (errorRate >= 0.05 || deadEndRate >= 0.2) return 'attention';
	return 'healthy';
}

/** The tool with the most failed calls. */
export function worstTool(calls: InsightCall[]): string | null {
	const errors = new Map<string, number>();
	for (const call of calls) {
		if (call.kind === 'tool' && call.status === 'error') {
			errors.set(call.name, (errors.get(call.name) ?? 0) + 1);
		}
	}
	return [...errors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
