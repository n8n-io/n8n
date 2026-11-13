/**
 * Builds the credentials file of spec section 7 from the output of
 * `n8n export:credentials --decrypted` and the credential slots of a workflow.
 */
import ts from 'typescript';

import { findWorkflowDefinition, getProperty } from '../compiler/analysis.ts';
import { decodeModule } from '../compiler/decode.ts';
import { literalJson } from '../compiler/index.ts';
import type { Inject, InjectKind } from './inject.ts';
import { withDerivedValues } from './derived.ts';
import { deriveInject } from './inject.ts';
import type { CredentialTypeRegistry } from './types.ts';
import { parentTypes } from './types.ts';

/** One credential of `n8n export:credentials --decrypted`. */
export interface ExportedCredential {
	id: string;
	name: string;
	type: string;
	data: Record<string, unknown>;
}

export interface CredentialsFileEntry {
	type: string;
	data: Record<string, unknown>;
	inject?: Inject;
}

export type CredentialsFile = Record<string, CredentialsFileEntry>;

/** A credential slot of a workflow: `credentials: { slack: { type: 'slackApi' } }`. */
export interface Slot {
	slot: string;
	type?: string;
}

export interface SlotReport {
	slot: string;
	credential: string;
	type: string;
	kind: InjectKind;
	notes: string[];
}

export interface BuildResult {
	file: CredentialsFile;
	report: SlotReport[];
}

export class CredentialsToolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CredentialsToolError';
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads export output. `export:credentials` writes an array, or one object per
 * file with `--separate`. `data` must be decrypted: an encrypted export holds
 * a string there.
 */
export function parseExport(json: unknown, origin = 'export'): ExportedCredential[] {
	const list = Array.isArray(json) ? json : [json];
	return list.map((entry, i) => {
		if (!isRecord(entry)) throw new CredentialsToolError(`${origin}[${i}] is not an object`);
		const { id, name, type, data } = entry;
		if (typeof type !== 'string' || typeof name !== 'string') {
			throw new CredentialsToolError(`${origin}[${i}] has no "name" and "type"`);
		}
		if (typeof data === 'string') {
			throw new CredentialsToolError(
				`credential "${name}" is encrypted. Export with "n8n export:credentials --decrypted".`,
			);
		}
		if (!isRecord(data)) throw new CredentialsToolError(`credential "${name}" has no data`);
		return {
			id: typeof id === 'string' || typeof id === 'number' ? String(id) : '',
			name,
			type,
			data,
		};
	});
}

function slotsFromMeta(credentials: unknown): Slot[] {
	if (!isRecord(credentials)) return [];
	return Object.entries(credentials).map(([slot, value]) => ({
		slot,
		type: isRecord(value) && typeof value.type === 'string' ? value.type : undefined,
	}));
}

/** Reads the credential slots from the META section of a compiled module. */
export function slotsFromModule(bytes: Uint8Array): Slot[] {
	const meta: unknown = JSON.parse(decodeModule(bytes).meta);
	return slotsFromMeta(isRecord(meta) ? meta.credentials : undefined);
}

/** Reads the credential slots from a workflow source file. */
export function slotsFromSource(source: string, fileName = 'workflow.ts'): Slot[] {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true);
	const def = findWorkflowDefinition(sf);
	if (!def) throw new CredentialsToolError(`${fileName} has no workflow({...}) default export`);
	const expr = getProperty(def.options, 'credentials')?.initializer;
	return slotsFromMeta(expr ? literalJson(expr) : {});
}

/** Parses `--map slot=credential` arguments. */
export function parseMappings(values: string[]): Map<string, string> {
	const out = new Map<string, string>();
	for (const value of values) {
		const eq = value.indexOf('=');
		if (eq <= 0 || eq === value.length - 1) {
			throw new CredentialsToolError(`--map "${value}" must be <slot>=<credential name or id>`);
		}
		out.set(value.slice(0, eq), value.slice(eq + 1));
	}
	return out;
}

function findCredential(
	exported: ExportedCredential[],
	slot: string,
	reference: string | undefined,
	type: string | undefined,
	registry: CredentialTypeRegistry,
): ExportedCredential {
	if (reference !== undefined) {
		const byId = exported.filter((c) => c.id === reference);
		if (byId.length === 1) return byId[0];
		const byName = exported.filter((c) => c.name === reference);
		if (byName.length === 1) return byName[0];
		if (byName.length > 1) {
			throw new CredentialsToolError(
				`slot "${slot}": ${byName.length} credentials are named "${reference}". Map the slot by id.`,
			);
		}
		throw new CredentialsToolError(
			`slot "${slot}": no credential has the id or name "${reference}"`,
		);
	}
	const candidates = exported.filter(
		(c) => type !== undefined && (c.type === type || parentTypes(registry, c.type).includes(type)),
	);
	if (candidates.length === 1) return candidates[0];
	const detail =
		candidates.length === 0
			? `no exported credential has the type "${type ?? '?'}"`
			: `${candidates.length} credentials have the type "${type ?? '?'}"`;
	throw new CredentialsToolError(`slot "${slot}": ${detail}. Use --map ${slot}=<name or id>.`);
}

/**
 * Builds the credentials file. Each slot gets the credential that `mappings`
 * names, or else the only exported credential of the slot's type. The data
 * gets the defaults of the credential type for fields that it does not set.
 */
export function buildCredentialsFile(input: {
	exported: ExportedCredential[];
	slots: Slot[];
	mappings: Map<string, string>;
	registry: CredentialTypeRegistry;
}): BuildResult {
	const { exported, mappings, registry } = input;
	const slots = [...input.slots];
	for (const slot of mappings.keys()) {
		if (!slots.some((s) => s.slot === slot)) slots.push({ slot });
	}
	if (slots.length === 0) {
		throw new CredentialsToolError('no credential slots: give a workflow, a module or --map');
	}
	const file: CredentialsFile = {};
	const report: SlotReport[] = [];
	for (const { slot, type } of slots) {
		const credential = findCredential(exported, slot, mappings.get(slot), type, registry);
		if (
			type !== undefined &&
			credential.type !== type &&
			!parentTypes(registry, credential.type).includes(type)
		) {
			throw new CredentialsToolError(
				`slot "${slot}" needs type "${type}", but credential "${credential.name}" has type "${credential.type}"`,
			);
		}
		const defaults = registry.get(credential.type)?.defaults ?? {};
		const data = withDerivedValues(credential.type, { ...defaults, ...credential.data });
		const derived = deriveInject(registry, credential.type, data);
		const entry: CredentialsFileEntry = { type: credential.type, data };
		if (derived.inject) entry.inject = derived.inject;
		file[slot] = entry;
		report.push({
			slot,
			credential: credential.name,
			type: credential.type,
			kind: derived.kind,
			notes: derived.reasons,
		});
	}
	return { file, report };
}

export function formatReport(report: SlotReport[]): string {
	return report
		.map((r) => {
			const notes = r.notes.length > 0 ? ` (${r.notes.join('; ')})` : '';
			return `${r.slot}: "${r.credential}" ${r.type}, inject ${r.kind}${notes}`;
		})
		.join('\n');
}
