import type {
	BuiltObservationLogStore,
	ObservationLogEntry,
	ObservationLogReflectFn,
	ObservationLogReflectorInput,
	ObservationLogMarker,
	ObservationLogMerge,
	ObservationLogReflection,
	ObservationLogReflectionResult,
	ObservationLogScopeKind,
	TokenCounter,
} from '../types/sdk/observation-log';
import { estimateObservationTokens } from '../types/sdk/observation-log';

export type { ObservationLogReflectFn, ObservationLogReflectorInput };

const MARKER_LABELS: Record<ObservationLogMarker, string> = {
	critical: 'CRITICAL',
	important: 'IMPORTANT',
	info: 'INFO',
	completion: 'COMPLETION',
};

const REFLECTOR_OVER_BUDGET_WARNING =
	'Observation log remains over reflector budget after reflection';

export type ObservationLogReflectorMemory = BuiltObservationLogStore;

export interface ObservationLogReflectorWarning {
	message: string;
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	tokenCount: number;
	tokenBudget: number;
}

export interface RunObservationLogReflectorOpts {
	memory: ObservationLogReflectorMemory;
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	reflectorThresholdTokens: number;
	reflect: ObservationLogReflectFn;
	tokenCounter?: TokenCounter;
	now?: Date;
	onWarning?: (warning: ObservationLogReflectorWarning) => void;
}

export type RunObservationLogReflectorResult =
	| { status: 'skipped'; reason: 'below-threshold'; tokenCount: number }
	| {
			status: 'ran';
			tokenCount: number;
			remainingTokenCount: number;
			overBudgetAfterReflection: boolean;
			reflection: ObservationLogReflection;
			result: ObservationLogReflectionResult;
	  };

export function parseObservationLogReflectionJson(output: string): ObservationLogReflection {
	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonObject(output));
	} catch {
		throw new Error('Reflector output must be valid JSON');
	}
	if (!isRecord(parsed)) throw new Error('Reflector output must be a JSON object');

	return {
		drop: readStringArray(parsed.drop ?? [], 'drop'),
		merge: readMergeArray(parsed.merge ?? []),
	};
}

export function renderObservationLogForReflection(entries: ObservationLogEntry[]): string {
	const activeEntries = entries.filter((entry) => entry.status === 'active').sort(compareEntries);
	const activeIds = new Set(activeEntries.map((entry) => entry.id));
	const childrenByParent = new Map<string, ObservationLogEntry[]>();
	const roots: ObservationLogEntry[] = [];

	for (const entry of activeEntries) {
		if (entry.parentId && activeIds.has(entry.parentId)) {
			const children = childrenByParent.get(entry.parentId) ?? [];
			children.push(entry);
			childrenByParent.set(entry.parentId, children);
		} else {
			roots.push(entry);
		}
	}

	const lines: string[] = [];
	for (const root of roots) {
		lines.push(renderReflectionBullet(root));
		for (const child of childrenByParent.get(root.id) ?? []) {
			lines.push(renderReflectionBullet(child, '  '));
		}
	}

	return lines.join('\n');
}

export function normalizeObservationLogReflection(
	activeObservationLog: ObservationLogEntry[],
	reflection: ObservationLogReflection,
): ObservationLogReflection {
	const activeEntries = activeObservationLog.filter((entry) => entry.status === 'active');
	const activeById = new Map(activeEntries.map((entry) => [entry.id, entry]));
	const childrenByParent = new Map<string, ObservationLogEntry[]>();
	for (const entry of activeEntries) {
		if (!entry.parentId) continue;
		const children = childrenByParent.get(entry.parentId) ?? [];
		children.push(entry);
		childrenByParent.set(entry.parentId, children);
	}

	const dropSeeds = new Set(reflection.drop.filter((id) => activeById.has(id)));
	const allMergeSeeds = new Set(
		reflection.merge.flatMap((merge) => merge.supersedes).filter((id) => activeById.has(id)),
	);
	const claimedMergeIds = new Set<string>();
	const merge = reflection.merge
		.map((entry) => {
			const ownSeeds = new Set(entry.supersedes.filter((id) => activeById.has(id)));
			const supersedes = uniqueObservationIds(
				entry.supersedes
					.filter((id) => activeById.has(id))
					.filter((id) => !isChildOnlyRemoval(id, ownSeeds, allMergeSeeds, dropSeeds, activeById))
					.flatMap((id) => [id, ...descendantIds(id, childrenByParent)]),
			).filter((id) => !claimedMergeIds.has(id));

			for (const id of supersedes) claimedMergeIds.add(id);
			if (supersedes.length === 0) return null;

			return {
				...entry,
				supersedes,
			};
		})
		.filter((entry): entry is ObservationLogMerge => entry !== null);

	const droppedIds = new Set<string>();
	for (const id of reflection.drop) {
		if (!activeById.has(id) || claimedMergeIds.has(id)) continue;
		if (hasAncestorIn(id, dropSeeds, activeById)) continue;
		if (isChildOnlyRemoval(id, dropSeeds, dropSeeds, claimedMergeIds, activeById)) continue;

		for (const candidateId of [id, ...descendantIds(id, childrenByParent)]) {
			if (!claimedMergeIds.has(candidateId)) droppedIds.add(candidateId);
		}
	}

	const removedIds = new Set([...droppedIds, ...claimedMergeIds]);
	return {
		drop: [...droppedIds],
		merge: merge.map((entry) => ({
			...entry,
			parentId: normalizeReplacementParentId(entry.parentId, activeById, removedIds),
		})),
	};
}

export async function runObservationLogReflector(
	opts: RunObservationLogReflectorOpts,
): Promise<RunObservationLogReflectorResult> {
	const { memory, scopeKind, scopeId, reflectorThresholdTokens } = opts;
	const tokenCounter = opts.tokenCounter ?? estimateObservationTokens;
	const activeObservationLog = await memory.getActiveObservationLog({
		scopeKind,
		scopeId,
		order: 'asc',
	});
	const tokenCount = countObservationTokens(activeObservationLog, tokenCounter);
	if (tokenCount <= reflectorThresholdTokens) {
		return { status: 'skipped', reason: 'below-threshold', tokenCount };
	}

	const now = opts.now ?? new Date();
	const renderedObservationLog = renderObservationLogForReflection(activeObservationLog);
	const output = await opts.reflect({
		scopeKind,
		scopeId,
		now,
		activeObservationLog,
		renderedObservationLog,
		tokenCount,
		tokenBudget: reflectorThresholdTokens,
	});
	const reflection = normalizeObservationLogReflection(
		activeObservationLog,
		withCreatedAt(parseObservationLogReflectionJson(output), now),
	);
	const result = await memory.applyObservationLogReflection({ scopeKind, scopeId }, reflection);

	const remainingTokenCount = countObservationTokens(
		await memory.getActiveObservationLog({ scopeKind, scopeId }),
		tokenCounter,
	);
	const overBudgetAfterReflection = remainingTokenCount > reflectorThresholdTokens;
	if (overBudgetAfterReflection) {
		opts.onWarning?.({
			message: REFLECTOR_OVER_BUDGET_WARNING,
			scopeKind,
			scopeId,
			tokenCount: remainingTokenCount,
			tokenBudget: reflectorThresholdTokens,
		});
	}

	return {
		status: 'ran',
		tokenCount,
		remainingTokenCount,
		overBudgetAfterReflection,
		reflection,
		result,
	};
}

function uniqueObservationIds(ids: string[]): string[] {
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const id of ids) {
		if (seen.has(id)) continue;
		seen.add(id);
		unique.push(id);
	}
	return unique;
}

function descendantIds(id: string, childrenByParent: Map<string, ObservationLogEntry[]>): string[] {
	const descendants: string[] = [];
	const visit = (parentId: string) => {
		for (const child of childrenByParent.get(parentId) ?? []) {
			descendants.push(child.id);
			visit(child.id);
		}
	};
	visit(id);
	return descendants;
}

function hasAncestorIn(
	id: string,
	ids: Set<string>,
	activeById: Map<string, ObservationLogEntry>,
): boolean {
	let parentId = activeById.get(id)?.parentId ?? null;
	while (parentId) {
		if (ids.has(parentId)) return true;
		parentId = activeById.get(parentId)?.parentId ?? null;
	}
	return false;
}

function isChildOnlyRemoval(
	id: string,
	ownActionIds: Set<string>,
	allSameKindActionIds: Set<string>,
	otherRemovalIds: Set<string>,
	activeById: Map<string, ObservationLogEntry>,
): boolean {
	const parentId = activeById.get(id)?.parentId;
	if (!parentId) return false;
	if (hasAncestorIn(id, ownActionIds, activeById)) return false;
	if (hasAncestorIn(id, allSameKindActionIds, activeById)) return true;
	return !hasAncestorIn(id, otherRemovalIds, activeById);
}

function normalizeReplacementParentId(
	parentId: string | null | undefined,
	activeById: Map<string, ObservationLogEntry>,
	removedIds: Set<string>,
): string | null | undefined {
	if (parentId === undefined || parentId === null) return parentId;
	return activeById.has(parentId) && !removedIds.has(parentId) ? parentId : null;
}

function extractJsonObject(output: string): string {
	const start = output.indexOf('{');
	const end = output.lastIndexOf('}');
	if (start === -1 || end === -1 || end < start) {
		throw new Error('Reflector output did not contain a JSON object');
	}
	return output.slice(start, end + 1);
}

function readStringArray(value: unknown, fieldName: string): string[] {
	if (!Array.isArray(value)) throw new Error(`Reflector field "${fieldName}" must be an array`);
	const strings: string[] = [];
	for (const item of value) {
		if (typeof item !== 'string') {
			throw new Error(`Reflector field "${fieldName}" must contain only strings`);
		}
		strings.push(item);
	}
	return strings;
}

function readMergeArray(value: unknown): ObservationLogMerge[] {
	if (!Array.isArray(value)) throw new Error('Reflector field "merge" must be an array');
	return value.map(readMerge);
}

function readMerge(value: unknown, index: number): ObservationLogMerge {
	if (!isRecord(value)) throw new Error(`Reflector merge[${index}] must be an object`);
	const supersedes = readStringArray(value.supersedes, `merge[${index}].supersedes`);
	const marker = readMarker(value.marker, index);
	if (typeof value.text !== 'string') {
		throw new Error(`Reflector merge[${index}].text must be a string`);
	}

	const parentId = readOptionalParentId(value.parentId, index);
	return {
		supersedes,
		marker,
		text: value.text,
		...(parentId !== undefined && { parentId }),
	};
}

function readMarker(value: unknown, index: number): ObservationLogMarker {
	if (typeof value !== 'string') {
		throw new Error(`Reflector merge[${index}].marker must be a known observation marker`);
	}

	switch (value.toUpperCase()) {
		case 'CRITICAL':
			return 'critical';
		case 'IMPORTANT':
			return 'important';
		case 'INFO':
			return 'info';
		case 'COMPLETION':
			return 'completion';
		default:
			throw new Error(`Reflector merge[${index}].marker must be a known observation marker`);
	}
}

function readOptionalParentId(value: unknown, index: number): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null || typeof value === 'string') return value;
	throw new Error(`Reflector merge[${index}].parentId must be a string or null`);
}

function withCreatedAt(reflection: ObservationLogReflection, now: Date): ObservationLogReflection {
	return {
		drop: reflection.drop,
		merge: reflection.merge.map((merge, index) => ({
			...merge,
			createdAt: merge.createdAt ?? new Date(now.getTime() + index),
		})),
	};
}

function countObservationTokens(
	entries: ObservationLogEntry[],
	tokenCounter: TokenCounter,
): number {
	return entries.reduce((total, entry) => total + observationTokenCount(entry, tokenCounter), 0);
}

function observationTokenCount(entry: ObservationLogEntry, tokenCounter: TokenCounter): number {
	if (Number.isFinite(entry.tokenCount) && entry.tokenCount > 0) return entry.tokenCount;
	return tokenCounter(entry.text);
}

function compareEntries(a: ObservationLogEntry, b: ObservationLogEntry): number {
	const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
	if (timeDiff !== 0) return timeDiff;
	return a.id.localeCompare(b.id);
}

function renderReflectionBullet(entry: ObservationLogEntry, indent = ''): string {
	return `${indent}* [${entry.id}] ${MARKER_LABELS[entry.marker]} ${entry.createdAt.toISOString()} ${entry.text}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
