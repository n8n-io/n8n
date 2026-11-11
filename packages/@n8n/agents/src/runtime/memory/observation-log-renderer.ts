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

interface ObservationAncestry {
	ancestors: ObservationLogEntry[];
	tokenCount: number;
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
	const childrenByParent = new Map<string, ObservationLogEntry[]>();
	const roots: ObservationLogEntry[] = [];
	for (const entry of activeEntries) {
		if (entry.parentId) {
			const children = childrenByParent.get(entry.parentId) ?? [];
			children.push(entry);
			childrenByParent.set(entry.parentId, children);
		} else {
			roots.push(entry);
		}
	}

	// Cache binary ancestors so rejected chains do not repeat linear parent walks.
	const ancestryById = new Map<string, ObservationAncestry>();
	const ancestryQueue = [...roots];
	for (const root of roots) {
		ancestryById.set(root.id, {
			ancestors: [],
			tokenCount: getStoredObservationTokenCount(root),
		});
	}
	for (let index = 0; index < ancestryQueue.length; index++) {
		const parent = ancestryQueue[index];
		const parentAncestry = ancestryById.get(parent.id);
		if (!parentAncestry) continue;
		for (const child of childrenByParent.get(parent.id) ?? []) {
			const ancestors = [parent];
			for (let level = 1; ; level++) {
				const halfway = ancestors[level - 1];
				const ancestor = ancestryById.get(halfway.id)?.ancestors[level - 1];
				if (!ancestor) break;
				ancestors.push(ancestor);
			}
			ancestryById.set(child.id, {
				ancestors,
				tokenCount: parentAncestry.tokenCount + getStoredObservationTokenCount(child),
			});
			ancestryQueue.push(child);
		}
	}

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
		const ancestry = ancestryById.get(entry.id);
		if (!ancestry) continue;

		let firstRequiredAncestry = ancestry;
		for (let level = ancestry.ancestors.length - 1; level >= 0; level--) {
			const ancestor = firstRequiredAncestry.ancestors[level];
			if (ancestor && !included.has(ancestor.id)) {
				firstRequiredAncestry = ancestryById.get(ancestor.id) ?? firstRequiredAncestry;
			}
		}
		const includedAncestor = firstRequiredAncestry.ancestors[0];
		const includedAncestorAncestry =
			includedAncestor && included.has(includedAncestor.id)
				? ancestryById.get(includedAncestor.id)
				: undefined;
		const tokenCount = ancestry.tokenCount - (includedAncestorAncestry?.tokenCount ?? 0);
		if (tokenCount > remainingTokens) continue;

		let required: ObservationLogEntry | undefined = entry;
		while (required && !included.has(required.id)) {
			included.add(required.id);
			required = required.parentId ? activeById.get(required.parentId) : undefined;
		}
		remainingTokens -= tokenCount;
	}

	if (included.size === 0) return null;

	const includedRoots = roots.filter((entry) => included.has(entry.id));
	if (includedRoots.length === 0) return null;

	const lines: string[] = ['<observations>', MEMORY_INTRO, MARKER_LEGEND, ''];
	const renderTree = (entry: ObservationLogEntry, indent = '') => {
		lines.push(renderBullet(entry, indent));
		for (const child of childrenByParent.get(entry.id) ?? []) {
			if (included.has(child.id)) renderTree(child, `${indent}  `);
		}
	};
	for (const root of includedRoots) renderTree(root);
	lines.push('</observations>');

	return lines.join('\n');
}
