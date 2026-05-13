import type {
	BuiltObservationLogStore,
	ObservationLogEntry,
	ObservationLogMarker,
	ObservationLogMerge,
	ObservationLogReflection,
	ObservationLogReflectionResult,
	ObservationLogScopeKind,
	TokenCounter,
} from '../types/sdk/observation-log';
import { estimateObservationTokens } from '../types/sdk/observation-log';

const MARKER_SYMBOLS: Record<ObservationLogMarker, string> = {
	critical: '🔴',
	important: '🟡',
	info: '🟢',
	completion: '✅',
};

const REFLECTOR_OVER_BUDGET_WARNING =
	'Observation log remains over reflector budget after reflection';

export interface ObservationLogReflectorInput {
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	now: Date;
	activeObservationLog: ObservationLogEntry[];
	renderedObservationLog: string;
	tokenCount: number;
	tokenBudget: number;
}

export type ObservationLogReflectFn = (input: ObservationLogReflectorInput) => Promise<string>;

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

	const lines: string[] = [];
	for (const root of roots) {
		lines.push(renderReflectionBullet(root));
		for (const child of childrenByParent.get(root.id) ?? []) {
			lines.push(renderReflectionBullet(child, '  '));
		}
	}

	return lines.join('\n');
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
	const reflection = withCreatedAt(parseObservationLogReflectionJson(output), now);
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
	switch (value) {
		case '🔴':
		case 'critical':
			return 'critical';
		case '🟡':
		case 'important':
			return 'important';
		case '🟢':
		case 'info':
			return 'info';
		case '✅':
		case 'completion':
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
	return `${indent}* [${entry.id}] ${MARKER_SYMBOLS[entry.marker]} ${entry.createdAt.toISOString()} ${entry.text}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
