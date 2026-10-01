import { deepCopy } from 'n8n-workflow';

import type { AgentJsonConfig } from '../types';

export function tryParseConfig(text: string): { ok: true; value: AgentJsonConfig } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) as AgentJsonConfig };
	} catch {
		return { ok: false };
	}
}

/** Split a dotted config path, dropping empty segments. */
export function splitPath(path: string): string[] {
	return path.split('.').filter((p) => p.length > 0);
}

/**
 * Read a slice out of the config at a dotted path. Numeric path segments index
 * into arrays; everything else indexes into objects. Returns the root config
 * when the path is empty, `null` when the config is null, and `undefined` when
 * a segment can't be resolved.
 */
export function getSlice(cfg: AgentJsonConfig | null, path: string | null | undefined): unknown {
	if (!cfg) return null;
	if (!path) return cfg;
	let cur: unknown = cfg;
	for (const part of splitPath(path)) {
		if (cur === null || cur === undefined) return undefined;
		const idx = Number(part);
		if (Array.isArray(cur) && Number.isInteger(idx)) {
			cur = cur[idx];
		} else if (typeof cur === 'object') {
			cur = (cur as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}
	return cur;
}

/** Non-mutating write — returns a new config with `slice` placed at `path`. */
export function setSlice(cfg: AgentJsonConfig, path: string, slice: unknown): AgentJsonConfig {
	const next = deepCopy(cfg);
	const parts = splitPath(path);
	if (parts.length === 0) return slice as AgentJsonConfig;
	let cur: unknown = next;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		const idx = Number(part);
		if (Array.isArray(cur) && Number.isInteger(idx)) {
			cur = cur[idx];
		} else if (cur && typeof cur === 'object') {
			cur = (cur as Record<string, unknown>)[part];
		}
	}
	const last = parts[parts.length - 1];
	const idx = Number(last);
	if (Array.isArray(cur) && Number.isInteger(idx)) {
		(cur as unknown[])[idx] = slice;
	} else if (cur && typeof cur === 'object') {
		(cur as Record<string, unknown>)[last] = slice;
	}
	return next;
}

/** Subset object containing only the requested top-level keys. */
export function pickFrom(cfg: AgentJsonConfig | null, keys: string[]): Record<string, unknown> {
	if (!cfg) return {};
	const source = cfg as unknown as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (key in source) out[key] = source[key];
	}
	return out;
}

/**
 * Render the editor's document text for either a section slice (`path`) or a
 * pick-keys subset, falling back to empty string when nothing applies.
 */
export function configToDoc(
	cfg: AgentJsonConfig | null,
	path: string | null | undefined,
	keys: string[] | null | undefined,
): string {
	if (!cfg) return '';
	if (keys && keys.length > 0) return JSON.stringify(pickFrom(cfg, keys), null, 2);
	const slice = getSlice(cfg, path);
	if (slice === undefined) return '';
	return JSON.stringify(slice, null, 2);
}
