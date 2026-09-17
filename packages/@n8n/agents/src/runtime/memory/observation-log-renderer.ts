import {
	getStoredObservationTokenCount,
	type ObservationLogEntry,
	type ObservationLogMarker,
} from '../../types/sdk/observation-log';

const MARKER_LABELS: Record<ObservationLogMarker, string> = {
	critical: 'CRITICAL',
	important: 'IMPORTANT',
	info: 'INFO',
	completion: 'COMPLETION',
};

const MARKER_PRIORITY: Record<ObservationLogMarker, number> = {
	critical: 0,
	important: 1,
	completion: 2,
	info: 3,
};

const MEMORY_INTRO =
	'The following is your memory of this conversation. It accumulates as observations are made. Older entries may have been merged or dropped during periodic restructuring.';
const MARKER_LEGEND =
	'Marker legend: CRITICAL = must retain, IMPORTANT = useful continuity, INFO = contextual detail, COMPLETION = completed/resolved.';

export interface RenderObservationLogOptions {
	renderTokenBudget?: number;
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

function renderBullet(entry: ObservationLogEntry, indent = ''): string {
	return `${indent}* ${MARKER_LABELS[entry.marker]} (${formatObservationTime(entry.createdAt)}) ${entry.text}`;
}

export function renderObservationLog(
	entries: ObservationLogEntry[],
	options: RenderObservationLogOptions = {},
): string | null {
	const activeEntries = entries.filter((entry) => entry.status === 'active').sort(compareEntries);
	const activeById = new Map(activeEntries.map((entry) => [entry.id, entry]));
	const candidates = [...activeEntries].sort(
		(a, b) =>
			MARKER_PRIORITY[a.marker] - MARKER_PRIORITY[b.marker] ||
			b.createdAt.getTime() - a.createdAt.getTime() ||
			a.id.localeCompare(b.id),
	);
	let remainingTokens = options.renderTokenBudget ?? Number.POSITIVE_INFINITY;

	const included = new Set<string>();
	for (const entry of candidates) {
		if (included.has(entry.id)) continue;
		const required = new Set<string>();
		let ancestor: ObservationLogEntry | undefined = entry;
		let tokenCount = 0;
		while (ancestor && !included.has(ancestor.id)) {
			if (required.has(ancestor.id)) {
				ancestor = undefined;
				break;
			}
			required.add(ancestor.id);
			tokenCount += getStoredObservationTokenCount(ancestor);
			if (!ancestor.parentId) break;
			ancestor = activeById.get(ancestor.parentId);
		}
		if (!ancestor || tokenCount > remainingTokens) continue;
		for (const id of required) included.add(id);
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
		} else if (!entry.parentId) {
			roots.push(entry);
		}
	}

	if (roots.length === 0) return null;

	const lines: string[] = ['<observations>', MEMORY_INTRO, MARKER_LEGEND, ''];
	const renderTree = (entry: ObservationLogEntry, indent = '') => {
		lines.push(renderBullet(entry, indent));
		for (const child of childrenByParent.get(entry.id) ?? []) {
			renderTree(child, `${indent}  `);
		}
	};
	for (const root of roots) renderTree(root);
	lines.push('</observations>');

	return lines.join('\n');
}
