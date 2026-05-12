import type {
	ObservationLogEntry,
	ObservationLogMarker,
	TokenCounter,
} from '../types/sdk/observation-log';
import { estimateObservationTokens } from '../types/sdk/observation-log';

const MARKER_SYMBOLS: Record<ObservationLogMarker, string> = {
	critical: '🔴',
	important: '🟡',
	info: '🟢',
	completion: '✅',
};

const MEMORY_INTRO =
	'The following is your memory of this conversation. It accumulates as observations are made. Older entries may have been merged or dropped during periodic restructuring.';

export interface RenderObservationLogOptions {
	renderTokenBudget?: number;
	tokenCounter?: TokenCounter;
}

function compareEntries(a: ObservationLogEntry, b: ObservationLogEntry): number {
	const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
	if (timeDiff !== 0) return timeDiff;
	return a.id.localeCompare(b.id);
}

function formatObservationTime(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

function observationTokenCount(entry: ObservationLogEntry, tokenCounter: TokenCounter): number {
	if (Number.isFinite(entry.tokenCount) && entry.tokenCount > 0) return entry.tokenCount;
	return tokenCounter(entry.text);
}

function renderBullet(entry: ObservationLogEntry, indent = ''): string {
	return `${indent}* ${MARKER_SYMBOLS[entry.marker]} (${formatObservationTime(entry.createdAt)}) ${entry.text}`;
}

export function renderObservationLog(
	entries: ObservationLogEntry[],
	options: RenderObservationLogOptions = {},
): string | null {
	const activeEntries = entries.filter((entry) => entry.status === 'active').sort(compareEntries);
	const tokenCounter = options.tokenCounter ?? estimateObservationTokens;
	const renderTokenBudget = options.renderTokenBudget;
	let remainingTokens = renderTokenBudget ?? Number.POSITIVE_INFINITY;

	const included = new Set<string>();
	for (const entry of activeEntries) {
		const tokenCount = observationTokenCount(entry, tokenCounter);
		if (tokenCount > remainingTokens) continue;
		included.add(entry.id);
		remainingTokens -= tokenCount;
	}

	if (included.size === 0) return null;

	const childrenByParent = new Map<string, ObservationLogEntry[]>();
	const roots: ObservationLogEntry[] = [];

	for (const entry of activeEntries) {
		if (!included.has(entry.id)) continue;
		if (entry.parentId && included.has(entry.parentId)) {
			const children = childrenByParent.get(entry.parentId) ?? [];
			children.push(entry);
			childrenByParent.set(entry.parentId, children);
		} else {
			roots.push(entry);
		}
	}

	const lines: string[] = ['<observations>', '## Memory', '', MEMORY_INTRO, ''];
	for (const root of roots) {
		lines.push(renderBullet(root));
		for (const child of childrenByParent.get(root.id) ?? []) {
			lines.push(renderBullet(child, '  '));
		}
	}
	lines.push('</observations>');

	return lines.join('\n');
}
